/**
 * @license
 * Copyright 2022 The matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeviceTypeDefinition } from "./DeviceTypes.js";
import { ClusterServer } from "../protocol/interaction/InteractionServer.js";
import { AtLeastOne } from "../util/Array.js";
import { DescriptorCluster } from "../cluster/DescriptorCluster.js";
import { DeviceTypeId } from "../datatype/DeviceTypeId.js";
import { BitSchema, TypeFromPartialBitSchema } from "../schema/BitmapSchema.js";
import { Attributes, Cluster, Commands, Events } from "../cluster/Cluster.js";
import { ClusterId } from "../datatype/ClusterId.js";
import { EndpointNumber } from "../datatype/EndpointNumber.js";
import { FixedLabelCluster, UserLabelCluster } from "../cluster/LabelCluster.js";
import { ClusterClientObj } from "../cluster/client/ClusterClient.js";
import { ClusterServerObj, ClusterServerObjForCluster } from "../cluster/server/ClusterServer.js";
import { InteractionClient } from "../protocol/interaction/InteractionClient.js";
import { AllClustersMap, BridgedDeviceBasicInformationCluster } from "../cluster/index.js";
import { BasicInformationCluster } from "../cluster/BasicInformationCluster.js";

export interface EndpointOptions {
    endpointId?: number;
    uniqueStorageKey?: string;
}

export class Endpoint {
    private readonly clusterServers = new Map<number, ClusterServerObj<Attributes, Commands, Events>>();
    private readonly clusterClients = new Map<number, ClusterClientObj<any, Attributes, Commands, Events>>();
    private readonly childEndpoints: Endpoint[] = [];
    id: number | undefined;
    uniqueStorageKey: string | undefined;
    name = "";
    private structureChangedCallback: () => void = () => {/** noop until officially set **/ };

    private descriptorCluster: ClusterServerObjForCluster<typeof DescriptorCluster>;

    /**
     * Create a new Endpoint instance.
     *
     * @param deviceTypes One or multiple DeviceTypeDefinitions of the endpoint
     * @param options Options for the endpoint
     */
    constructor(
        protected deviceTypes: AtLeastOne<DeviceTypeDefinition>,
        options: EndpointOptions = {}
    ) {
        this.descriptorCluster = ClusterServer(
            DescriptorCluster,
            {
                deviceTypeList: deviceTypes.map(deviceType => ({
                    deviceType: new DeviceTypeId(deviceType.code),
                    revision: deviceType.revision
                })),
                serverList: [],
                clientList: [],
                partsList: []
            },
            {}
        );
        this.addClusterServer(this.descriptorCluster);
        this.setDeviceTypes(deviceTypes);

        if (options.endpointId !== undefined) {
            this.id = options.endpointId;
        }
        if (options.uniqueStorageKey !== undefined) {
            this.uniqueStorageKey = options.uniqueStorageKey;
        }
    }

    setStructureChangedCallback(callback: () => void) {
        this.structureChangedCallback = callback;
        this.childEndpoints.forEach(endpoint => endpoint.setStructureChangedCallback(callback));
    }

    clearStructureChangedCallback() {
        this.structureChangedCallback = () => {/** noop **/ };
        this.childEndpoints.forEach(endpoint => endpoint.clearStructureChangedCallback());
    }

    getId() {
        if (this.id === undefined) {
            throw new Error("Endpoint has not been assigned yet");
        }
        return this.id;
    }

    addFixedLabel(label: string, value: string) {
        if (!this.hasClusterServer(FixedLabelCluster)) {
            this.addClusterServer(ClusterServer(FixedLabelCluster, {
                labelList: []
            }, {}));
        }
        const fixedLabelCluster = this.getClusterServer(FixedLabelCluster);
        const labelList = fixedLabelCluster?.attributes.labelList.getLocal() ?? [];
        labelList.push({ label, value });
        fixedLabelCluster?.attributes.labelList.setLocal(labelList);
    }

    addUserLabel(label: string, value: string) {
        if (!this.hasClusterServer(UserLabelCluster)) {
            this.addClusterServer(ClusterServer(UserLabelCluster, {
                labelList: []
            }, {}));
        }
        const fixedLabelCluster = this.getClusterServer(UserLabelCluster);
        const labelList = fixedLabelCluster?.attributes.labelList.get() ?? [];
        labelList.push({ label, value });
        fixedLabelCluster?.attributes.labelList.set(labelList);
    }

    addClusterServer<A extends Attributes, C extends Commands, E extends Events>(cluster: ClusterServerObj<A, C, E>) {
        cluster._assignToEndpoint(this);
        if (cluster.id === DescriptorCluster.id) {
            this.descriptorCluster = cluster as unknown as ClusterServerObjForCluster<typeof DescriptorCluster>;
        }
        this.clusterServers.set(cluster.id, cluster);
        this.descriptorCluster.attributes.serverList.setLocal(Array.from(this.clusterServers.keys()).map((id) => new ClusterId(id)));
        this.structureChangedCallback(); // Inform parent about structure change
    }

    addClusterClient<F extends BitSchema, A extends Attributes, C extends Commands, E extends Events>(cluster: ClusterClientObj<F, A, C, E>) {
        this.clusterClients.set(cluster.id, cluster);
        this.descriptorCluster.attributes.clientList.setLocal(Array.from(this.clusterClients.keys()).map((id) => new ClusterId(id)));
        this.structureChangedCallback(); // Inform parent about structure change
    }

    // TODO cleanup with id number vs ClusterId
    // TODO add instance if optional and not existing, maybe get rid of undefined by throwing?
    getClusterServer<F extends BitSchema, SF extends TypeFromPartialBitSchema<F>, A extends Attributes, C extends Commands, E extends Events>(
        cluster: Cluster<F, SF, A, C, E>
    ): ClusterServerObj<A, C, E> | undefined {
        const clusterServer = this.clusterServers.get(cluster.id);
        if (clusterServer !== undefined) {
            return clusterServer as ClusterServerObj<A, C, E>;
        }
    }

    getClusterClient<F extends BitSchema, SF extends TypeFromPartialBitSchema<F>, A extends Attributes, C extends Commands, E extends Events>(
        cluster: Cluster<F, SF, A, C, E>,
        interactionClient?: InteractionClient
    ): ClusterClientObj<F, A, C, E> | undefined {
        const clusterClient = this.clusterClients.get(cluster.id);
        if (clusterClient !== undefined) {
            return clusterClient._clone(interactionClient) as ClusterClientObj<F, A, C, E>;
        }
        return undefined;
    }

    getClusterServerById(clusterId: number): ClusterServerObj<Attributes, Commands, Events> | undefined {
        return this.clusterServers.get(clusterId);
    }

    getClusterClientById(clusterId: number): ClusterClientObj<any, Attributes, Commands, Events> | undefined {
        return this.clusterClients.get(clusterId);
    }

    hasClusterServer<F extends BitSchema, SF extends TypeFromPartialBitSchema<F>, A extends Attributes, C extends Commands, E extends Events>(
        cluster: Cluster<F, SF, A, C, E>
    ): boolean {
        return this.clusterServers.has(cluster.id);
    }

    hasClusterClient<F extends BitSchema, SF extends TypeFromPartialBitSchema<F>, A extends Attributes, C extends Commands, E extends Events>(
        cluster: Cluster<F, SF, A, C, E>
    ): boolean {
        return this.clusterClients.has(cluster.id);
    }

    getDeviceTypes(): AtLeastOne<DeviceTypeDefinition> {
        return this.deviceTypes;
    }

    setDeviceTypes(deviceTypes: AtLeastOne<DeviceTypeDefinition>): void {
        // Remove duplicates, for now we ignore that there could be different revisions
        const deviceTypeList = new Map<number, DeviceTypeDefinition>();
        deviceTypes.forEach(deviceType => deviceTypeList.set(deviceType.code, deviceType));
        this.deviceTypes = Array.from(deviceTypeList.values()) as AtLeastOne<DeviceTypeDefinition>;
        this.name = deviceTypes[0].name;

        // Update descriptor cluster
        this.descriptorCluster.attributes.deviceTypeList.setLocal(
            this.deviceTypes.map(deviceType => ({
                deviceType: new DeviceTypeId(deviceType.code),
                revision: deviceType.revision
            }))
        );
    }

    addChildEndpoint(endpoint: Endpoint): void {
        this.childEndpoints.push(endpoint);
        endpoint.setStructureChangedCallback(this.structureChangedCallback);
        this.structureChangedCallback(); // Inform parent about structure change
    }

    getChildEndpoint(id: number): Endpoint | undefined {
        return this.childEndpoints.find(endpoint => endpoint.id === id);
    }

    getChildEndpoints(): Endpoint[] {
        return this.childEndpoints;
    }

    protected removeChildEndpoint(endpoint: Endpoint): void {
        const index = this.childEndpoints.indexOf(endpoint);
        if (index === -1) {
            throw new Error(`Provided endpoint for deletion does not exist as child endpoint.`);
        }
        this.childEndpoints.splice(index, 1);
        endpoint.clearStructureChangedCallback(); // remove
        this.structureChangedCallback(); // Inform parent about structure change
    }

    determineUniqueID(): string | undefined {
        // if the options in constructor contained a custom uniqueStorageKey, use this
        if (this.uniqueStorageKey !== undefined) {
            return `custom_${this.uniqueStorageKey}`;
        }
        // Else we check if we have a basic information cluster or bridged device basic information cluster and
        // use the uniqueId or serial number, if provided
        const basicInformationCluster = this.getClusterServer(BasicInformationCluster) ?? this.getClusterServer(BridgedDeviceBasicInformationCluster);
        if (basicInformationCluster !== undefined) {
            const uniqueId = basicInformationCluster.getUniqueIdAttribute?.();
            if (uniqueId !== undefined) {
                return `unique_${uniqueId}`;
            }
            const serialNumber = basicInformationCluster.getSerialNumberAttribute?.();
            if (serialNumber !== undefined) {
                return `serial_${serialNumber}`;
            }
        }
    }

    public verifyRequiredClusters(): void {
        this.deviceTypes.forEach(deviceType => {
            deviceType.requiredServerClusters?.forEach(clusterId => {
                if (!this.clusterServers.has(clusterId)) {
                    const clusterName = AllClustersMap[clusterId] ? AllClustersMap[clusterId].name : "unknown";
                    throw new Error(`Device type ${deviceType.name} (0x${deviceType.code.toString(16)}) requires cluster server ${clusterName}(0x${clusterId.toString(16)}) but it is not present on endpoint ${this.id}`);
                }
            });

            if (this.clusterClients.size > 0) { // TODO remove once supported
                throw new Error(`Devices with client clusters are not supported yet`);
            }
            deviceType.requiredClientClusters?.forEach(clusterId => {
                const clusterName = AllClustersMap[clusterId] ? AllClustersMap[clusterId].name : "unknown";
                if (!this.clusterClients.has(clusterId)) {
                    throw new Error(`Device type ${deviceType.name} (0x${deviceType.code.toString(16)}) requires cluster client ${clusterName}(0x${clusterId.toString(16)}) but it is not present on endpoint ${this.id}`);
                }
            });
        });
    }

    getAllClusterServers(): ClusterServerObj<Attributes, Commands, Events>[] {
        return Array.from(this.clusterServers.values());
    }

    getAllClusterClients(): ClusterClientObj<any, Attributes, Commands, Events>[] {
        return Array.from(this.clusterClients.values());
    }

    updatePartsList() {
        const newPartsList = new Array<EndpointNumber>();

        for (const child of this.childEndpoints) {
            const childPartsList = child.updatePartsList();

            if (child.id === undefined) {
                throw new Error(`Child endpoint has no id, can not add to parts list`);
            }

            newPartsList.push(new EndpointNumber(child.id));
            newPartsList.push(...childPartsList);
        }

        this.descriptorCluster.attributes.partsList.setLocal(newPartsList);

        return newPartsList;
    }

}
