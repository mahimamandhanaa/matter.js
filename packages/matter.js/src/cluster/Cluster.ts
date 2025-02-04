/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Merge } from "../util/Type.js";
import { BitSchema, TypeFromPartialBitSchema } from "../schema/BitmapSchema.js";
import { TlvSchema } from "../tlv/TlvSchema.js";
import { TlvVoid } from "../tlv/TlvVoid.js";
import { TlvFields, TlvObject, TypeFromFields } from "../tlv/TlvObject.js";
import { AttributeId, TlvAttributeId } from "../datatype/AttributeId.js";
import { EventId, TlvEventId } from "../datatype/EventId.js";
import { CommandId, TlvCommandId } from "../datatype/CommandId.js";
import { TlvBitmap, TlvUInt16, TlvUInt32 } from "../tlv/TlvNumber.js";
import { TlvArray } from "../tlv/TlvArray.js";
import { MatterCoreSpecificationV1_0 } from "../spec/Specifications.js";

export const enum AccessLevel {
    View,
    Manage,
    Administer,
}

export type ConditionalFeatureList<F extends BitSchema> = TypeFromPartialBitSchema<F>[];

/* Interfaces and helper methods to define a cluster attribute */
export interface Attribute<T, F extends BitSchema> {
    id: number,
    schema: TlvSchema<T>,
    optional: boolean,
    readAcl: AccessLevel,
    writable: boolean,
    scene: boolean,
    persistent: boolean,
    fixed: boolean,
    fabricScoped: boolean,
    omitChanges: boolean,
    writeAcl?: AccessLevel,
    default?: T,
    isConditional: boolean,
    optionalIf: ConditionalFeatureList<F>,
    mandatoryIf: ConditionalFeatureList<F>,
}

export interface OptionalAttribute<T, F extends BitSchema> extends Attribute<T, F> { optional: true }

export interface ConditionalAttribute<T, F extends BitSchema> extends OptionalAttribute<T, F> { isConditional: true }

export interface WritableAttribute<T, F extends BitSchema> extends Attribute<T, F> { writable: true }

export interface OptionalWritableAttribute<T, F extends BitSchema> extends OptionalAttribute<T, F> { writable: true }

export interface ConditionalWritableAttribute<T, F extends BitSchema> extends OptionalWritableAttribute<T, F> {
    isConditional: true,
}

export interface WritableFabricScopedAttribute<T, F extends BitSchema> extends WritableAttribute<T, F> {
    fabricScoped: true
}

export interface OptionalWritableFabricScopedAttribute<T, F extends BitSchema> extends OptionalWritableAttribute<T, F> {
    fabricScoped: true
}

export interface ConditionalWritableFabricScopedAttribute<T, F extends BitSchema> extends OptionalWritableFabricScopedAttribute<T, F> {
    isConditional: true,
}

export interface FixedAttribute<T, F extends BitSchema> extends Attribute<T, F> { fixed: true }

export interface OptionalFixedAttribute<T, F extends BitSchema> extends OptionalAttribute<T, F> { fixed: true }

export interface ConditionalFixedAttribute<T, F extends BitSchema> extends OptionalFixedAttribute<T, F> {
    isConditional: true,
}

export type AttributeJsType<T extends Attribute<any, any>> = T extends Attribute<infer JsType, any> ? JsType : never;

interface AttributeOptions<T> {
    scene?: boolean;
    persistent?: boolean;
    omitChanges?: boolean;
    default?: T;
    readAcl?: AccessLevel;
    writeAcl?: AccessLevel;
}

interface ConditionalAttributeOptions<T, F extends BitSchema> extends AttributeOptions<T> {
    optionalIf?: ConditionalFeatureList<F>,
    mandatoryIf?: ConditionalFeatureList<F>,
}

export const Attribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = false,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): Attribute<T, F> => ({
    id,
    schema,
    optional: false,
    writable: false,
    fixed: false,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const OptionalAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = false,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): OptionalAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: false,
    fixed: false,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const ConditionalAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = false,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    optionalIf = [],
    mandatoryIf = [],
}: ConditionalAttributeOptions<V, F>): ConditionalAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: false,
    fixed: false,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    isConditional: true,
    optionalIf,
    mandatoryIf,
});

export const WritableAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = true,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    writeAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): WritableAttribute<T, F> => ({
    id,
    schema,
    optional: false,
    writable: true,
    fixed: false,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    writeAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const OptionalWritableAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = true,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    writeAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): OptionalWritableAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: true,
    fixed: false,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    writeAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const ConditionalWritableAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = true,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    writeAcl = AccessLevel.View,
    optionalIf = [],
    mandatoryIf = [],
}: ConditionalAttributeOptions<V, F>): ConditionalWritableAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: true,
    fixed: false,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    writeAcl,
    isConditional: true,
    optionalIf,
    mandatoryIf,
});

export const WritableFabricScopedAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = true,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    writeAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): WritableFabricScopedAttribute<T, F> => ({
    id,
    schema,
    optional: false,
    writable: true,
    fixed: false,
    scene,
    persistent,
    fabricScoped: true,
    omitChanges,
    default: conformanceValue,
    readAcl,
    writeAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const OptionalWritableFabricScopedAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = true,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    writeAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): OptionalWritableFabricScopedAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: true,
    fixed: false,
    scene,
    persistent,
    fabricScoped: true,
    omitChanges,
    default: conformanceValue,
    readAcl,
    writeAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const ConditionalWritableFabricScopedAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = true,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    writeAcl = AccessLevel.View,
    optionalIf = [],
    mandatoryIf = [],
}: ConditionalAttributeOptions<V, F> = {}): ConditionalWritableFabricScopedAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: true,
    fixed: false,
    scene,
    persistent,
    fabricScoped: true,
    omitChanges,
    default: conformanceValue,
    readAcl,
    writeAcl,
    isConditional: true,
    optionalIf,
    mandatoryIf,
});

export const FixedAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = false,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): FixedAttribute<T, F> => ({
    id,
    schema,
    optional: false,
    writable: false,
    fixed: true,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const OptionalFixedAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = false,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
}: AttributeOptions<V> = {}): OptionalFixedAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: false,
    fixed: true,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const ConditionalFixedAttribute = <T, V extends T, F extends BitSchema>(id: number, schema: TlvSchema<T>, {
    scene = false,
    persistent = false,
    omitChanges = false,
    default: conformanceValue,
    readAcl = AccessLevel.View,
    optionalIf = [],
    mandatoryIf = [],
}: ConditionalAttributeOptions<V, F>): ConditionalFixedAttribute<T, F> => ({
    id,
    schema,
    optional: true,
    writable: false,
    fixed: true,
    scene,
    persistent,
    fabricScoped: false,
    omitChanges,
    default: conformanceValue,
    readAcl,
    isConditional: true,
    optionalIf,
    mandatoryIf,
});

export type MandatoryAttributeNames<A extends Attributes> = { [K in keyof A]: A[K] extends OptionalAttribute<any, any> ? never : K }[keyof A];
export type OptionalAttributeNames<A extends Attributes> = { [K in keyof A]: A[K] extends OptionalAttribute<any, any> ? K : never }[keyof A];
export type GlobalAttributeNames<F extends BitSchema> = keyof GlobalAttributes<F>;

/* Interfaces and helper methods to define a cluster command */
export const TlvNoResponse = TlvVoid;

export interface Command<RequestT, ResponseT, F extends BitSchema> {
    optional: boolean,
    requestId: number,
    requestSchema: TlvSchema<RequestT>,
    responseId: number,
    responseSchema: TlvSchema<ResponseT>,
    isConditional: boolean,
    mandatoryIf: ConditionalFeatureList<F>,
    optionalIf: ConditionalFeatureList<F>
}

export interface OptionalCommand<RequestT, ResponseT, F extends BitSchema> extends Command<RequestT, ResponseT, F> {
    optional: true,
}

export interface ConditionalCommand<RequestT, ResponseT, F extends BitSchema> extends OptionalCommand<RequestT, ResponseT, F> {
    isConditional: true,
}

export type ResponseType<T extends Command<any, any, any>> = T extends OptionalCommand<any, infer ResponseT, any> ? ResponseT : (T extends Command<any, infer ResponseT, any> ? ResponseT : never);
export type RequestType<T extends Command<any, any, any>> = T extends OptionalCommand<infer RequestT, any, any> ? RequestT : (T extends Command<infer RequestT, any, any> ? RequestT : never);

interface ConditionalCommandOptions<F extends BitSchema> {
    optionalIf?: ConditionalFeatureList<F>,
    mandatoryIf?: ConditionalFeatureList<F>
}

export const Command = <RequestT, ResponseT, F extends BitSchema>(
    requestId: number,
    requestSchema: TlvSchema<RequestT>,
    responseId: number,
    responseSchema: TlvSchema<ResponseT>
): Command<RequestT, ResponseT, F> => ({
    optional: false,
    requestId,
    requestSchema,
    responseId,
    responseSchema,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const OptionalCommand = <RequestT, ResponseT, F extends BitSchema>(
    requestId: number,
    requestSchema: TlvSchema<RequestT>,
    responseId: number,
    responseSchema: TlvSchema<ResponseT>,
): OptionalCommand<RequestT, ResponseT, F> => ({
    optional: true,
    requestId,
    requestSchema,
    responseId,
    responseSchema,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const ConditionalCommand = <RequestT, ResponseT, F extends BitSchema>(
    requestId: number,
    requestSchema: TlvSchema<RequestT>,
    responseId: number,
    responseSchema: TlvSchema<ResponseT>,
    {
        optionalIf = [],
        mandatoryIf = []
    }: ConditionalCommandOptions<F>
): ConditionalCommand<RequestT, ResponseT, F> => ({
    optional: true,
    requestId,
    requestSchema,
    responseId,
    responseSchema,
    isConditional: true,
    optionalIf,
    mandatoryIf,
});

/* Interfaces and helper methods to define a cluster event */
export const enum EventPriority {
    Critical,
    Info,
    Debug,
}

export interface Event<T, F extends BitSchema> {
    id: number,
    schema: TlvSchema<T>,
    priority: EventPriority,
    optional: boolean,
    isConditional: boolean,
    optionalIf: ConditionalFeatureList<F>,
    mandatoryIf: ConditionalFeatureList<F>
}

interface ConditionalEventOptions<F extends BitSchema> {
    optionalIf?: ConditionalFeatureList<F>,
    mandatoryIf?: ConditionalFeatureList<F>
}

export interface OptionalEvent<T, F extends BitSchema> extends Event<T, F> {
    optional: true
}

export interface ConditionalEvent<T, F extends BitSchema> extends OptionalEvent<T, F> {
    isConditional: true,
}

export const Event = <FT extends TlvFields, F extends BitSchema>(id: number, priority: EventPriority, data: FT = <FT>{}): Event<TypeFromFields<FT>, F> => ({
    id,
    schema: TlvObject(data),
    priority,
    optional: false,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const OptionalEvent = <FT extends TlvFields, F extends BitSchema>(id: number, priority: EventPriority, data: FT = <FT>{}): OptionalEvent<TypeFromFields<FT>, F> => ({
    id,
    schema: TlvObject(data),
    priority,
    optional: true,
    isConditional: false,
    optionalIf: [],
    mandatoryIf: [],
});

export const ConditionalEvent = <FT extends TlvFields, F extends BitSchema>(
    id: number,
    priority: EventPriority,
    data: FT = <FT>{},
    {
        optionalIf = [],
        mandatoryIf = []
    }: ConditionalEventOptions<F>
): ConditionalEvent<TypeFromFields<FT>, F> => ({
    id,
    schema: TlvObject(data),
    priority,
    optional: true,
    isConditional: true,
    optionalIf,
    mandatoryIf,
});

export type EventType<T extends Event<any, any>> = T extends OptionalEvent<infer EventT, any> ? EventT : (T extends Event<infer EventT, any> ? EventT : never);
export type MandatoryEventNames<E extends Events> = { [K in keyof E]: E[K] extends OptionalEvent<any, any> ? never : K }[keyof E];
export type OptionalEventNames<E extends Events> = { [K in keyof E]: E[K] extends OptionalEvent<any, any> ? K : never }[keyof E];

/* Interfaces and helper methods to define a cluster */
export interface Attributes {
    [key: string]: Attribute<any, any>
}

export interface Commands {
    [key: string]: Command<any, any, any>
}

export interface Events {
    [key: string]: Event<any, any>
}

// TODO Adjust typing to be derived from the schema below
/** @see {@link MatterCoreSpecificationV1_0} § 7.13 */
export type GlobalAttributes<F extends BitSchema> = {
    /** Indicates the revision of the server cluster specification supported by the cluster instance. */
    clusterRevision: Attribute<number, never>,

    /** Indicates whether the server supports zero or more optional cluster features. */
    featureMap: Attribute<TypeFromPartialBitSchema<F>, never>,

    /** List of the attribute IDs of the attributes supported by the cluster instance. */
    attributeList: Attribute<AttributeId[], never>,

    /** List of the event IDs of the events supported by the cluster instance. */
    eventList: Attribute<EventId[], never>,

    /** List of client generated commands which are supported by this cluster server instance. */
    acceptedCommandList: Attribute<CommandId[], never>,

    /** List of server generated commands (server to client commands). */
    generatedCommandList: Attribute<CommandId[], never>,
}

export const GlobalAttributes = <F extends BitSchema>(features: F) => ({
    clusterRevision: Attribute(0xFFFD, TlvUInt16),
    featureMap: Attribute(0xFFFC, TlvBitmap(TlvUInt32, features)),
    attributeList: Attribute(0xFFFB, TlvArray(TlvAttributeId)),
    eventList: Attribute(0xFFFA, TlvArray(TlvEventId)),
    acceptedCommandList: Attribute(0xFFF9, TlvArray(TlvCommandId)),
    generatedCommandList: Attribute(0xFFF8, TlvArray(TlvCommandId)),
} as GlobalAttributes<F>);

export interface Cluster<F extends BitSchema, SF extends TypeFromPartialBitSchema<F>, A extends Attributes, C extends Commands, E extends Events> {
    id: number,
    name: string,
    revision: number,
    features: F,
    supportedFeatures: SF,
    attributes: A,
    commands: C,
    events: E,
}

export const Cluster = <F extends BitSchema, SF extends TypeFromPartialBitSchema<F>, A extends Attributes = {}, C extends Commands = {}, E extends Events = {}>({
    id,
    name,
    revision,
    features = <F>{},
    supportedFeatures = <SF>{},
    attributes = <A>{},
    commands = <C>{},
    events = <E>{},
}: {
    id: number,
    name: string,
    revision: number,
    features?: F,
    supportedFeatures?: SF,
    attributes?: A,
    commands?: C,
    events?: E,
}): Cluster<F, SF, Merge<A, GlobalAttributes<F>>, C, E> => ({
    id,
    name,
    revision,
    features,
    supportedFeatures,
    commands,
    attributes: Merge(attributes, GlobalAttributes(features)),
    events,
});

type ClusterExtend<F extends BitSchema, SF extends TypeFromPartialBitSchema<F>, A extends Attributes, C extends Commands, E extends Events> = {
    supportedFeatures: SF,
    attributes?: A,
    commands?: C,
    events?: E,
};

// TODO Find out why eslint markts that as unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ClusterExtend =
    <
        F extends BitSchema,
        SF_BASE extends TypeFromPartialBitSchema<F>,
        SF_EXTEND extends TypeFromPartialBitSchema<F>,
        A_BASE extends Attributes = {},
        C_BASE extends Commands = {},
        E_BASE extends Events = {},
        A_EXTEND extends Attributes = {},
        C_EXTEND extends Commands = {},
        E_EXTEND extends Events = {},
    >(
        {
            id,
            name,
            revision,
            features,
            supportedFeatures,
            attributes,
            commands,
            events
        }: Cluster<F, SF_BASE, A_BASE, C_BASE, E_BASE>,
        {
            supportedFeatures: supportedFeaturesExtend,
            attributes: attributesExtend = <A_EXTEND>{},
            commands: commandsExtend = <C_EXTEND>{},
            events: eventsExtend = <E_EXTEND>{},
        }: ClusterExtend<F, SF_EXTEND, A_EXTEND, C_EXTEND, E_EXTEND>
    ): Cluster<
        F,
        Merge<SF_BASE, SF_EXTEND>,
        Merge<A_BASE, A_EXTEND>,
        Merge<C_BASE, C_EXTEND>,
        Merge<E_BASE, E_EXTEND>
    > => (
        {
            id,
            name,
            revision,
            features,
            supportedFeatures: Merge(supportedFeatures, supportedFeaturesExtend),
            attributes: Merge(attributes, attributesExtend),
            commands: Merge(commands, commandsExtend),
            events: Merge(events, eventsExtend),
        }
    );
