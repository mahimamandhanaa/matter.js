[@project-chip/matter-node.js](../README.md) / [Modules](../modules.md) / [util](../modules/util.md) / DataReader

# Class: DataReader<E\>

[util](../modules/util.md).DataReader

Reader that auto-increments its offset after each read.

## Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends [`Endian`](../enums/util.Endian.md) |

## Table of contents

### Constructors

- [constructor](util.DataReader.md#constructor)

### Properties

- [buffer](util.DataReader.md#buffer)
- [dataView](util.DataReader.md#dataview)
- [getOffsetAndAdvance](util.DataReader.md#getoffsetandadvance)
- [littleEndian](util.DataReader.md#littleendian)
- [offset](util.DataReader.md#offset)

### Methods

- [getRemainingBytes](util.DataReader.md#getremainingbytes)
- [getRemainingBytesCount](util.DataReader.md#getremainingbytescount)
- [readByteArray](util.DataReader.md#readbytearray)
- [readDouble](util.DataReader.md#readdouble)
- [readFloat](util.DataReader.md#readfloat)
- [readInt16](util.DataReader.md#readint16)
- [readInt32](util.DataReader.md#readint32)
- [readInt64](util.DataReader.md#readint64)
- [readInt8](util.DataReader.md#readint8)
- [readUInt16](util.DataReader.md#readuint16)
- [readUInt32](util.DataReader.md#readuint32)
- [readUInt64](util.DataReader.md#readuint64)
- [readUInt8](util.DataReader.md#readuint8)
- [readUtf8String](util.DataReader.md#readutf8string)

## Constructors

### constructor

• **new DataReader**<`E`\>(`buffer`, `endian`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends [`Endian`](../enums/util.Endian.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `buffer` | `Uint8Array` |
| `endian` | `E` |

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:13

## Properties

### buffer

• `Private` `Readonly` **buffer**: `any`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:9

___

### dataView

• `Private` `Readonly` **dataView**: `any`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:11

___

### getOffsetAndAdvance

• `Private` **getOffsetAndAdvance**: `any`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:28

___

### littleEndian

• `Private` `Readonly` **littleEndian**: `any`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:10

___

### offset

• `Private` **offset**: `any`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:12

## Methods

### getRemainingBytes

▸ **getRemainingBytes**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:27

___

### getRemainingBytesCount

▸ **getRemainingBytesCount**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:26

___

### readByteArray

▸ **readByteArray**(`length`): `Uint8Array`

#### Parameters

| Name | Type |
| :------ | :------ |
| `length` | `number` |

#### Returns

`Uint8Array`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:25

___

### readDouble

▸ **readDouble**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:23

___

### readFloat

▸ **readFloat**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:22

___

### readInt16

▸ **readInt16**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:19

___

### readInt32

▸ **readInt32**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:20

___

### readInt64

▸ **readInt64**(): `bigint`

#### Returns

`bigint`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:21

___

### readInt8

▸ **readInt8**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:18

___

### readUInt16

▸ **readUInt16**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:15

___

### readUInt32

▸ **readUInt32**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:16

___

### readUInt64

▸ **readUInt64**(): `bigint`

#### Returns

`bigint`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:17

___

### readUInt8

▸ **readUInt8**(): `number`

#### Returns

`number`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:14

___

### readUtf8String

▸ **readUtf8String**(`length`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `length` | `number` |

#### Returns

`string`

#### Defined in

packages/matter.js/dist/cjs/util/DataReader.d.ts:24
