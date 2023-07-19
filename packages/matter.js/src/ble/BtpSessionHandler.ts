/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ByteArray, Endian } from "../util/ByteArray.js";
import { BtpCodec } from "../codec/BtpCodec.js";
import { Logger } from "../log/Logger.js";
import { Time } from "../time/Time.js";
import { DataReader } from "../util/DataReader.js";
import { MatterError } from "../common/MatterError.js";

export class BtpMatterError extends MatterError { }
export class BtpProtocolError extends BtpMatterError { }
export class BtpFlowError extends BtpMatterError { }

const logger = Logger.get("BtpSessionHandler");

const SUPPORTED_BTP_VERSIONS = [4]; // needs to be sort in descending order!
const MINIMUM_ATT_MTU = 23; // 23-byte minimum ATT_MTU - 3 bytes for ATT operation header
const MAXIMUM_BTP_MTU = 247; // Maximum size of BTP segment
const MAXIMUM_WINDOW_SIZE = 255; // Server maximum window size
const BTP_ACK_TIMEOUT_MS = 15000; // timer in ms before ack should be sent for a segment
const BTP_SEND_ACK_TIMEOUT_MS = 5000; // BTP_ACK_TIMEOUT_MS / 3: timer starts when we receive a packet and stops when we sends its ack

export class BtpSessionHandler {
    private currentIncomingSegmentedMsgLength: number | undefined;
    private currentIncomingSegmentedPayload: ByteArray | undefined;
    private prevIncomingSequenceNumber = 255; // Incoming Sequence Number received. Set to 255 to start at 0
    private prevIncomingAckNumber = -1; // Previous ackNumber received
    private readonly ackReceiveTimer = Time.getTimer(BTP_ACK_TIMEOUT_MS, () => this.btpAckTimeoutTriggered());

    private sequenceNumber = 0; // Sequence number is set to 0 already for the handshake, next sequence number is 1
    private prevAckedSequenceNumber = -1; // Previous (outgoing) Acked Sequence Number
    private readonly queuedOutgoingMatterMessages = new Array<DataReader<Endian.Little>>();
    private sendInProgress = false;
    private readonly sendAckTimer = Time.getTimer(BTP_SEND_ACK_TIMEOUT_MS, () => this.btpSendAckTimeoutTriggered());
    private isActive = true;

    /**
     * Creates a new BTP session handler
     *
     * @param btpVersion The BTP protocol version to use
     * @param fragmentSize The fragment size to use for the messages
     * @param clientWindowSize The client window size to use
     * @param writeBleCallback Callback to write data to the BLE transport
     * @param disconnectBleCallback Callback to disconnect the BLE transport
     * @param handleMatterMessagePayload Callback to handle a Matter message payload
     */
    constructor(
        btpVersion: number,
        private readonly fragmentSize: number,
        private readonly clientWindowSize: number,
        private readonly writeBleCallback: (data: ByteArray) => Promise<void>,
        private readonly disconnectBleCallback: () => void,
        private readonly handleMatterMessagePayload: (data: ByteArray) => void,
    ) {
        if (btpVersion !== 4) {
            throw new BtpProtocolError(`Unsupported BTP version ${btpVersion}`);
        }
        this.ackReceiveTimer.start();
    }

    /** Factory method to create a new BTPSessionHandler from a received handshake request */
    static async createFromHandshakeRequest(
        maxDataSize: number | undefined,
        handshakeRequestPayload: ByteArray,
        writeBleCallback: (data: ByteArray) => Promise<void>,
        disconnectBleCallback: () => void,
        handleMatterMessagePayload: (data: ByteArray) => void,
    ): Promise<BtpSessionHandler> {
        // Decode handshake request
        const handshakeRequest = BtpCodec.decodeBtpHandshakeRequest(handshakeRequestPayload);

        const { versions, attMtu: handshakeMtu, clientWindowSize } = handshakeRequest;

        // Verify handshake request and choose the highest supported version for both parties
        const version = SUPPORTED_BTP_VERSIONS.find(version => versions.includes(version));
        if (version === undefined) {
            disconnectBleCallback();
            throw new BtpProtocolError(`No supported BTP version found in ${versions}`);
        }

        let attMtu = MINIMUM_ATT_MTU;
        if (maxDataSize !== undefined) {
            maxDataSize += 3; // This is without the 3 bytes GATT PDU header
            if (maxDataSize > MINIMUM_ATT_MTU) {
                if (handshakeMtu <= MINIMUM_ATT_MTU) {
                    attMtu = Math.min(maxDataSize, MAXIMUM_BTP_MTU);
                } else {
                    attMtu = Math.min(handshakeMtu, maxDataSize, MAXIMUM_BTP_MTU);
                }
            }
        }

        const fragmentSize = attMtu - 3; // Each GATT PDU used by the BTP protocol introduces 3 byte header overhead.
        const windowSize = Math.min(MAXIMUM_WINDOW_SIZE, clientWindowSize);

        // Generate and send out handshake response
        const handshakeResponse = BtpCodec.encodeBtpHandshakeResponse({
            version, attMtu, windowSize
        });

        logger.debug(`Sending BTP handshake response: ${handshakeResponse.toHex()}`);
        logger.debug(`Sending BTP packet: ${Logger.dict({
            version, attMtu, windowSize
        })}`);

        const btpSession =  new BtpSessionHandler(
            version, fragmentSize, windowSize, writeBleCallback, disconnectBleCallback, handleMatterMessagePayload
        );

        await writeBleCallback(handshakeResponse);

        return btpSession;
    }

    /**
     * Handle incoming data from the transport layer and hand over completely received matter messages to the
     * ExchangeManager layer
     *
     * @param data ByteArray containing the data
     */
    public handleIncomingBleData(data: ByteArray) {
        try {
            if (data.length > this.fragmentSize) { // Apple seems to interpret the ATT_MTU as the maximum size of a single ATT packet
                if (data.length > this.fragmentSize + 3) {
                    throw new BtpProtocolError(`Received data ${data.length} bytes exceeds fragment size of ${this.fragmentSize} bytes`);
                } else {
                    logger.warn(`Received data ${data.length} bytes exceeds fragment size of ${this.fragmentSize} bytes`);
                }
            }
            const btpPacket = BtpCodec.decodeBtpPacket(data);
            logger.debug(`Received BTP packet: ${Logger.toJSON(btpPacket)}`);
            const {
                header: {
                    hasAckNumber, isHandshakeRequest, hasManagementOpcode, isEndingSegment,
                    isBeginningSegment, isContinuingSegment
                },
                payload: {
                    ackNumber, sequenceNumber, messageLength,
                    segmentPayload
                }
            } = btpPacket;

            if (isHandshakeRequest || hasManagementOpcode) {
                throw new BtpProtocolError("BTP packet must not be a handshake request or have a management opcode.");
            }
            if (segmentPayload.length === 0 && !hasAckNumber) {
                throw new BtpProtocolError("BTP packet must have a segment payload or an ack number.");
            }

            if (sequenceNumber !== ((this.prevIncomingSequenceNumber + 1) % 256)) {
                logger.debug(`sequenceNumber : ${sequenceNumber}, prevClientSequenceNumber : ${this.prevIncomingSequenceNumber}`);
                throw new BtpProtocolError("Expected and actual BTP packets sequence number does not match");
            }
            this.prevIncomingSequenceNumber = sequenceNumber;

            if (!this.sendAckTimer.isRunning) {
                this.sendAckTimer.start();
            }

            if (hasAckNumber && ackNumber !== undefined) {
                // check that ack number is valid
                if (ackNumber <= this.prevIncomingAckNumber || ackNumber > this.sequenceNumber) {
                    throw new BtpProtocolError(`Invalid Ack Number, Ack Number: ${ackNumber}, Sequence Number: ${this.sequenceNumber}, Previous AckNumber: ${this.prevIncomingAckNumber}`);
                }

                // for valid ack, stop timer and update prevIncomingAckNumber
                this.ackReceiveTimer.stop();
                this.prevIncomingAckNumber = ackNumber;

                // if still waiting for ack for sequence number restart timer
                if (ackNumber < this.sequenceNumber) {
                    this.ackReceiveTimer.start();
                }
            }

            // Set or add the payload to the current incoming segmented payload
            if (isBeginningSegment) {
                if (this.currentIncomingSegmentedPayload !== undefined) {
                    throw new BtpProtocolError(`BTP message flow error! New beginning packet was received without previous message being completed.`);
                }
                this.currentIncomingSegmentedMsgLength = messageLength;
                this.currentIncomingSegmentedPayload = segmentPayload;
            } else if (isContinuingSegment || isEndingSegment) {
                if (this.currentIncomingSegmentedPayload === undefined) {
                    throw new BtpProtocolError(`BTP Continuing or ending packet received without beginning packet.`);
                }
                if (segmentPayload.length === 0) {
                    throw new BtpProtocolError(`BTP Continuing or ending packet received without payload.`);
                }
                this.currentIncomingSegmentedPayload = ByteArray.concat(this.currentIncomingSegmentedPayload, segmentPayload);
            }

            if (isEndingSegment) {
                if (this.currentIncomingSegmentedMsgLength === undefined || this.currentIncomingSegmentedPayload === undefined) {
                    throw new BtpProtocolError("BTP beginning packet missing but ending packet received.");
                }
                if (this.currentIncomingSegmentedPayload.length !== this.currentIncomingSegmentedMsgLength) {
                    throw new BtpProtocolError(`BTP packet payload length does not match message length: ${this.currentIncomingSegmentedPayload.length} !== ${this.currentIncomingSegmentedMsgLength}`);
                }

                const payloadToProcess = this.currentIncomingSegmentedPayload;
                this.currentIncomingSegmentedMsgLength = undefined
                this.currentIncomingSegmentedPayload = undefined; // resetting current segment Payload to empty byte array

                // Hand over the resulting Matter message to ExchangeManager via the callback
                this.handleMatterMessagePayload(payloadToProcess);
            }

        } catch (error) {
            logger.error(`Error while handling incoming BTP data: ${error}`);
            this.close();
            if (!(error instanceof BtpProtocolError)) { // If no BTP protocol error, rethrow
                throw error;
            }
        }
    }

    /**
     * Send a Matter message to the transport layer, but before that encode it into a BTP packet and potentially split
     * it into multiple segments. This Method is indirectly called by the ExchangeManager layer when a Matter message
     * should be sent.
     *
     * @param data ByteArray containing the Matter message
     */
    public async sendMatterMessage(data: ByteArray) {
        logger.debug(`Got Matter message to send via BLE transport: ${data.toHex()}`);

        if (data.length === 0) {
            throw new BtpFlowError("BTP packet must not be empty");
        }
        const dataReader = new DataReader(data, Endian.Little);
        this.queuedOutgoingMatterMessages.push(dataReader);
        await this.processSendQueue();
    }

    private async processSendQueue() {
        if (this.sendInProgress) return;

        if (this.sequenceNumber - this.prevIncomingAckNumber > (this.clientWindowSize - 1)) return;

        if (this.queuedOutgoingMatterMessages.length === 0) return;

        this.sendInProgress = true;


        while (this.queuedOutgoingMatterMessages.length > 0) {
            const currentProcessedMessage = this.queuedOutgoingMatterMessages[0];
            const remainingMessageLength = currentProcessedMessage.getRemainingBytesCount();

            logger.debug(`Sending BTP fragment: ${Logger.dict({
                fullMessageLength: currentProcessedMessage.getLength(),
                remainingLengthInBytes: remainingMessageLength,
            })}`);

            //checks if last ack number sent < ack number to be sent
            const hasAckNumber = this.prevIncomingSequenceNumber > this.prevAckedSequenceNumber;
            if (hasAckNumber) {
                this.prevAckedSequenceNumber = this.prevIncomingSequenceNumber;
                this.sendAckTimer.stop();
            }

            const isBeginningSegment = remainingMessageLength === currentProcessedMessage.getLength();

            // Calculate Header Size - faster than encoding and checking length
            const btpHeaderLength = 2 + (isBeginningSegment ? 2 : 0) + (hasAckNumber ? 1 : 0); // 2(flags, sequenceNumber) + 2(beginning) + 1(ackNumber)

            const isEndingSegment = remainingMessageLength <= (this.fragmentSize - btpHeaderLength);

            const packetHeader = {
                isHandshakeRequest: false,
                hasManagementOpcode: false,
                hasAckNumber,
                isBeginningSegment,
                isContinuingSegment: !isBeginningSegment,
                isEndingSegment,
            };

            logger.debug(`Take up to ${this.fragmentSize - btpHeaderLength} bytes from Rest of message: ${remainingMessageLength}`);

            const segmentPayload = currentProcessedMessage.readByteArray(this.fragmentSize - btpHeaderLength);

            const btpPacket = {
                header: packetHeader,
                payload: {
                    ackNumber: hasAckNumber ? this.prevIncomingSequenceNumber : undefined,
                    sequenceNumber: this.getNextSequenceNumber(),
                    messageLength: packetHeader.isBeginningSegment ? remainingMessageLength : undefined, // remainingMessageLength if the fill length on beginning packet
                    segmentPayload,
                }
            };

            logger.debug(`Sending BTP packet: ${Logger.toJSON(btpPacket)}`);
            const packet = BtpCodec.encodeBtpPacket(btpPacket);
            logger.debug(`Sending BTP packet raw: ${packet.toHex()}`);

            await this.writeBleCallback(packet);

            if (!this.ackReceiveTimer.isRunning) {
                this.ackReceiveTimer.start(); // starts the timer
            }

            // Remove the message from the queue if it is the last segment
            if (isEndingSegment) {
                this.queuedOutgoingMatterMessages.shift();
            }

            // If the window is full, stop sending for now
            if (this.sequenceNumber - this.prevIncomingAckNumber > (this.clientWindowSize - 1)) {
                break;
            }
        }
        this.sendInProgress = false;
    }

    /**
     * Close the BTP session. This method is called when the BLE transport is disconnected and so the BTP session gets closed.
     */
    public close() {
        this.ackReceiveTimer.stop();
        this.sendAckTimer.stop();
        if (this.isActive) {
            this.isActive = false;
            this.disconnectBleCallback();
        }
    }

    /**
     * If this timer expires and the peer has a pending acknowledgement, the peer SHALL immediately send that
     * acknowledgement
     */
    private async btpSendAckTimeoutTriggered() {
        if (this.prevIncomingSequenceNumber > this.prevAckedSequenceNumber) {
            logger.debug(`Sending BTP ACK for sequence number ${this.prevIncomingSequenceNumber}`);
            const btpPacket = {
                header: {
                    isHandshakeRequest: false,
                    hasManagementOpcode: false,
                    hasAckNumber: true,
                    isBeginningSegment: false,
                    isContinuingSegment: false,
                    isEndingSegment: false,
                },
                payload: {
                    ackNumber: this.prevIncomingSequenceNumber,
                    sequenceNumber: this.getNextSequenceNumber()
                }
            };
            this.prevAckedSequenceNumber = this.prevIncomingSequenceNumber;
            const packet = BtpCodec.encodeBtpPacket(btpPacket);
            await this.writeBleCallback(packet);
            if (!this.ackReceiveTimer.isRunning) {
                this.ackReceiveTimer.start(); // starts the timer
            }
        }
    }

    /**
     * If a peer’s acknowledgement-received timer expires, or if a peer receives an invalid acknowledgement,
     * the peer SHALL close the BTP session and report an error to the application.
     */
    private btpAckTimeoutTriggered() {
        if (this.prevIncomingAckNumber !== this.sequenceNumber) {
            this.close()
            throw new BtpProtocolError("Acknowledgement for the sent sequence number was not received");
        }
    }

    private getNextSequenceNumber() {
        this.sequenceNumber++;
        if (this.sequenceNumber > 255) {
            this.sequenceNumber = 0;
        }
        return this.sequenceNumber;
    }
}
