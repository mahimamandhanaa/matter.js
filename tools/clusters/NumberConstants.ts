/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Globals } from "#matter.js/model/elements/Globals.js";
import {
    UINT8_MAX,
    UINT16_MAX,
    UINT24_MAX,
    UINT32_MAX,
    UINT64_MAX,
    INT8_MIN,
    INT8_MAX,
    INT16_MIN,
    INT16_MAX,
    INT32_MIN,
    INT32_MAX,
    INT64_MIN,
    INT64_MAX,
    FLOAT32_MIN,
    FLOAT32_MAX
} from "#matter.js/util/Number.js";

/**
 * Map of matter datatype names to TlvGenerator.tlvImport arguments.
 */
export const SpecializedNumbers: { [name: string]: [string, string] } = {
    [Globals.actionId.name]: ["datatype", "TlvActionId"],
    [Globals.attributeId.name]: ["datatype", "TlvAttributeId"],
    [Globals.clusterId.name]: ["datatype", "TlvClusterId"],
    [Globals.commandId.name]: ["datatype", "TlvCommandId"],
    [Globals.deviceTypeId.name]: ["datatype", "TlvDeviceTypeId"],
    [Globals.endpointNo.name]: ["datatype", "TlvEndpointNumber"],
    [Globals.eventId.name]: ["datatype", "TlvEventId"],
    [Globals.fabricId.name]: ["datatype", "TlvFabricId"],
    [Globals.fabricIdx.name]: ["datatype", "TlvFabricIndex"],
    [Globals.groupId.name]: ["datatype", "TlvGroupId"],
    [Globals.nodeId.name]: ["datatype", "TlvNodeId"],
    [Globals.SubjectId.name]: ["datatype", "TlvSubjectId"],
    [Globals.vendorId.name]: ["datatype", "TlvVendorId"],
    [Globals.percent.name]: ["number", "TlvPercent"],
    [Globals.percent100ths.name]: ["number", "TlvPercent100ths"],
    [Globals.epochUs.name]: ["number", "TlvEpochUs"],
    [Globals.epochS.name]: ["number", "TlvEpochS"],
    [Globals.posixMs.name]: ["number", "TlvPosixMs"],
    [Globals.systimeUs.name]: ["number", "TlvSysTimeUs"],
    [Globals.systimeMs.name]: ["number", "TlvSysTimeMS"]
};

/**
 * Map of matter datatype names of wrapped TLV types to the wrapping field
 * name.
 * 
 * Turns out we don't actually need the key because we use the constructor but
 * leaving in place in case something changes.
 */
export const WrappedConstantKeys = {
    [Globals.actionId.name]: "id",
    [Globals.clusterId.name]: "id",
    [Globals.commandId.name]: "id",
    [Globals.deviceTypeId.name]: "id",
    [Globals.endpointNo.name]: "number",
    [Globals.eventId.name]: "id",
    [Globals.fabricId.name]: "id",
    [Globals.fabricIdx.name]: "index",
    [Globals.groupId.name]: "id",
    [Globals.nodeId.name]: "id",
    [Globals.SubjectId.name]: "id",
    [Globals.vendorId.name]: "id"
}

/**
 * Bounds for numeric types.
 */
export const NumericRanges = {
    uint8: { min: 0, max: UINT8_MAX },
    uint16: { min: 0, max: UINT16_MAX },
    uint24: { min: 0, max: UINT24_MAX },
    uint32: { min: 0, max: UINT32_MAX },
    uint64: { min: 0, max: UINT64_MAX },
    int8: { min: INT8_MIN, max: INT8_MAX },
    int16: { min: INT16_MIN, max: INT16_MAX },
    int32: { min: INT32_MIN, max: INT32_MAX },
    int64: { min: INT64_MIN, max: INT64_MAX },
    float32: { min: FLOAT32_MIN, max: FLOAT32_MAX },
    percent: { min: 0, max: 100 },
    percent100ths: { min: 0, max: 10000 }
}
