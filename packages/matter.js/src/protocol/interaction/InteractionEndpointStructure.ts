/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    AttributeServer, FabricScopedAttributeServer, FixedAttributeServer
} from "../../cluster/server/AttributeServer.js";
import { ClusterServerObj } from "../../cluster/server/ClusterServer.js";
import { CommandServer } from "../../cluster/server/CommandServer.js";
import { EventServer } from "../../cluster/server/EventServer.js";
import { NodeId } from "../../datatype/NodeId.js";
import { Endpoint } from "../../device/Endpoint.js";
import { TypeFromSchema } from "../../tlv/TlvSchema.js";
import { TlvAttributePath, TlvCommandPath, TlvEventPath } from "./InteractionProtocol.js";
import {
    AttributePath, attributePathToId, AttributeWithPath, CommandPath, commandPathToId, CommandWithPath, EventPath,
    eventPathToId, EventWithPath, genericElementPathToId
} from "./InteractionServer.js";

export class InteractionEndpointStructure {
    endpoints = new Map<number, Endpoint>();
    attributes = new Map<string, (AttributeServer<any> | FabricScopedAttributeServer<any> | FixedAttributeServer<any>)>();
    attributePaths = new Array<AttributePath>();
    events = new Map<string, EventServer<any>>();
    eventPaths = new Array<EventPath>();
    commands = new Map<string, CommandServer<any, any>>();
    commandPaths = new Array<CommandPath>();

    public clear() {
        this.endpoints.clear();
        this.attributes.clear();
        this.attributePaths.length = 0;
        this.events.clear();
        this.eventPaths.length = 0;
        this.commands.clear();
        this.commandPaths.length = 0;
    }

    public initializeFromEndpoint(endpoint: Endpoint) {
        this.clear();

        this.verifyAndInitializeStructureElementsFromEndpoint(endpoint); // Initialize Data from Root Endpoint
        this.initializeStructureFromEndpoints(endpoint); // Initialize Data from Child Endpoints
    }

    private initializeStructureFromEndpoints(endpoint: Endpoint) {
        const endpoints = endpoint.getChildEndpoints();
        for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex++) {
            this.verifyAndInitializeStructureElementsFromEndpoint(endpoints[endpointIndex]);
            this.initializeStructureFromEndpoints(endpoints[endpointIndex]);
        }
    }

    private verifyAndInitializeStructureElementsFromEndpoint(endpoint: Endpoint) {
        if (endpoint.id === undefined) {
            throw new Error(`Endpoint ID is undefined. It needs to be initialized first!`);
        }

        endpoint.verifyRequiredClusters();

        for (const cluster of endpoint.getAllClusterServers()) {
            const { id: clusterId, attributes: clusterAttributes, _events: clusterEvents, _commands: clusterCommands } = cluster;
            // Add attributes
            for (const name in clusterAttributes) {
                const attribute = clusterAttributes[name];
                const path = { endpointId: endpoint.id, clusterId, attributeId: attribute.id };
                this.attributes.set(attributePathToId(path), attribute);
                this.attributePaths.push(path);
            }

            // Add events
            for (const name in clusterEvents) {
                const event = clusterEvents[name];
                const path = { endpointId: endpoint.id, clusterId, eventId: event.id };
                this.events.set(eventPathToId(path), event);
                this.eventPaths.push(path);
            }

            // Add commands
            for (const name in clusterCommands) {
                const command = clusterCommands[name];
                const path = { endpointId: endpoint.id, clusterId, commandId: command.invokeId };
                this.commands.set(commandPathToId(path), command);
                this.commandPaths.push(path);
            }
        }

        if (this.endpoints.has(endpoint.id)) throw new Error(`Endpoint ID ${endpoint.id} exists twice`);

        this.endpoints.set(endpoint.id, endpoint);
    }

    toHex(value: number | bigint | undefined) {
        return value === undefined ? "*" : `0x${value.toString(16)}`;
    }

    resolveGenericElementName(nodeId: NodeId | undefined, endpointId: number | undefined, clusterId: number | undefined, elementId: number | undefined, elementMap: Map<string, any>) {
        const nodeIdPrefix = nodeId === undefined ? "" : `${this.toHex(nodeId.id)}/`;
        if (endpointId === undefined) {
            return `${nodeIdPrefix}*/${this.toHex(clusterId)}/${this.toHex(elementId)}`;
        }
        const endpoint = this.endpoints.get(endpointId);
        if (endpoint === undefined) {
            return `${nodeIdPrefix}unknown(${this.toHex(endpointId)})/${this.toHex(clusterId)}/${this.toHex(elementId)}`;
        }
        const endpointName = `${endpoint.name}(${this.toHex(endpointId)})`;

        if (clusterId === undefined) {
            return `${nodeIdPrefix}${endpointName}/*/${this.toHex(elementId)}`;
        }
        const cluster = endpoint.getClusterServerById(clusterId);
        if (cluster === undefined) {
            return `${nodeIdPrefix}${endpointName}/unknown(${this.toHex(clusterId)})/${this.toHex(elementId)}`;
        }
        const clusterName = `${cluster.name}(${this.toHex(clusterId)})`;

        if (elementId === undefined) {
            return `${nodeIdPrefix}${endpointName}/${clusterName}/*`;
        }
        const element = elementMap.get(genericElementPathToId(endpointId, clusterId, elementId));
        const elementName = `${element?.name ?? "unknown"}(${this.toHex(elementId)})`;
        return `${nodeIdPrefix}${endpointName}/${clusterName}/${elementName}`;
    }

    resolveAttributeName({ nodeId, endpointId, clusterId, attributeId }: TypeFromSchema<typeof TlvAttributePath>) {
        return this.resolveGenericElementName(nodeId, endpointId, clusterId, attributeId, this.attributes);
    }

    resolveEventName({ nodeId, endpointId, clusterId, eventId }: TypeFromSchema<typeof TlvEventPath>) {
        return this.resolveGenericElementName(nodeId, endpointId, clusterId, eventId, this.events);
    }

    resolveCommandName({ endpointId, clusterId, commandId }: TypeFromSchema<typeof TlvCommandPath>) {
        return this.resolveGenericElementName(undefined, endpointId, clusterId, commandId, this.commands);
    }

    getEndpoint(endpointId: number): Endpoint | undefined {
        return this.endpoints.get(endpointId);
    }

    hasEndpoint(endpointId: number): boolean {
        return this.endpoints.has(endpointId);
    }

    getClusterServer(endpointId: number, clusterId: number): ClusterServerObj<any, any, any> | undefined {
        return this.endpoints.get(endpointId)?.getClusterServerById(clusterId);
    }

    hasClusterServer(endpointId: number, clusterId: number): boolean {
        return !!this.getClusterServer(endpointId, clusterId);
    }

    getAttribute(endpointId: number, clusterId: number, attributeId: number): AttributeServer<any> | FabricScopedAttributeServer<any> | FixedAttributeServer<any> | undefined {
        return this.attributes.get(attributePathToId({ endpointId, clusterId, attributeId }));
    }

    hasAttribute(endpointId: number, clusterId: number, attributeId: number): boolean {
        return !!this.getAttribute(endpointId, clusterId, attributeId);
    }

    getEvent(endpointId: number, clusterId: number, eventId: number): EventServer<any> | undefined {
        return this.events.get(eventPathToId({ endpointId, clusterId, eventId }));
    }

    hasEvent(endpointId: number, clusterId: number, eventId: number): boolean {
        return !!this.getEvent(endpointId, clusterId, eventId);
    }

    getCommand(endpointId: number, clusterId: number, commandId: number): CommandServer<any, any> | undefined {
        return this.commands.get(commandPathToId({ endpointId, clusterId, commandId }));
    }

    hasCommand(endpointId: number, clusterId: number, commandId: number): boolean {
        return !!this.getCommand(endpointId, clusterId, commandId);
    }

    getAttributes(filters: TypeFromSchema<typeof TlvAttributePath>[], onlyWritable = false): AttributeWithPath[] {
        const result = new Array<AttributeWithPath>();

        filters.forEach(({ endpointId, clusterId, attributeId }) => {
            if (endpointId !== undefined && clusterId !== undefined && attributeId !== undefined) {
                const path = { endpointId, clusterId, attributeId };
                const attribute = this.attributes.get(attributePathToId(path));
                if (attribute === undefined) return;
                if (onlyWritable && !attribute.isWritable) return;
                result.push({ path, attribute });
            } else {
                this.attributePaths.filter(path =>
                    (endpointId === undefined || endpointId === path.endpointId)
                    && (clusterId === undefined || clusterId === path.clusterId)
                    && (attributeId === undefined || attributeId === path.attributeId))
                    .forEach(path => {
                        const attribute = this.attributes.get(attributePathToId(path));
                        if (attribute === undefined) return;
                        if (onlyWritable && !attribute.isWritable) return;
                        result.push({ path, attribute })
                    });
            }
        });

        return result;
    }

    getEvents(filters: TypeFromSchema<typeof TlvEventPath>[]): EventWithPath[] {
        const result = new Array<EventWithPath>();

        filters.forEach(({ endpointId, clusterId, eventId }) => {
            if (endpointId !== undefined && clusterId !== undefined && eventId !== undefined) {
                const path = { endpointId, clusterId, eventId };
                const event = this.events.get(eventPathToId(path));
                if (event === undefined) return;
                result.push({ path, event });
            } else {
                this.eventPaths.filter(path =>
                    (endpointId === undefined || endpointId === path.endpointId)
                    && (clusterId === undefined || clusterId === path.clusterId)
                    && (eventId === undefined || eventId === path.eventId))
                    .forEach(path => {
                        const event = this.events.get(eventPathToId(path));
                        if (event === undefined) return;
                        result.push({ path, event })
                    });
            }
        });

        return result;
    }

    getCommands(filters: TypeFromSchema<typeof TlvCommandPath>[]): CommandWithPath[] {
        const result = new Array<CommandWithPath>();

        filters.forEach(({ endpointId, clusterId, commandId }) => {
            if (endpointId !== undefined && clusterId !== undefined && commandId !== undefined) {
                const path = { endpointId, clusterId, commandId };
                const command = this.commands.get(commandPathToId(path));
                if (command === undefined) return;
                result.push({ path, command });
            } else {
                this.commandPaths.filter(path =>
                    (endpointId === undefined || endpointId === path.endpointId)
                    && (clusterId === undefined || clusterId === path.clusterId)
                    && (commandId === undefined || commandId === path.commandId))
                    .forEach(path => {
                        const command = this.commands.get(commandPathToId(path));
                        if (command === undefined) return;
                        result.push({ path, command })
                    });
            }
        });

        return result;
    }
}
