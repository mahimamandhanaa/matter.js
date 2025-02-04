/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UdpChannel } from './UdpChannel.js';
import { Channel } from "./Channel.js";
import { NetInterface, NetListener } from "./NetInterface.js";
import { Network } from './Network.js';
import { ByteArray } from "../util/ByteArray.js";

export class UdpInterface implements NetInterface {

    static async create(type: "udp4" | "udp6", port?: number, host?: string, netInterface?: string) {
        return new UdpInterface(await Network.get().createUdpChannel({ listeningPort: port, type, netInterface, listeningAddress: host }));
    }

    constructor(
        private readonly server: UdpChannel,
    ) { }

    async openChannel(host: string, port: number) {
        return Promise.resolve(new UdpConnection(this.server, host, port));
    }

    onData(listener: (channel: Channel<ByteArray>, messageBytes: ByteArray) => void): NetListener {
        return this.server.onData((_netInterface, peerAddress, peerPort, data) => listener(new UdpConnection(this.server, peerAddress, peerPort), data));
    }
    close() {
        this.server.close();
    }
}

class UdpConnection implements Channel<ByteArray> {
    constructor(
        private readonly server: UdpChannel,
        private readonly peerAddress: string,
        private readonly peerPort: number,
    ) { }

    send(data: ByteArray) {
        return this.server.send(this.peerAddress, this.peerPort, data);
    }

    getName() {
        return `udp://${this.peerAddress}:${this.peerPort}`;
    }
}
