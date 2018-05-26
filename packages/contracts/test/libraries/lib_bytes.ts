import { LogWithDecodedArgs, TransactionReceiptWithDecodedLogs, ZeroEx } from '0x.js';
import { BlockchainLifecycle, devConstants, web3Factory } from '@0xproject/dev-utils';
import { BigNumber } from '@0xproject/utils';
import { Web3Wrapper } from '@0xproject/web3-wrapper';
import BN = require('bn.js');
import * as chai from 'chai';
import ethUtil = require('ethereumjs-util');
import * as Web3 from 'web3';

import { TestLibBytesContract } from '../../src/contract_wrappers/generated/test_lib_bytes';
import { artifacts } from '../../src/utils/artifacts';
import { assetProxyUtils } from '../../src/utils/asset_proxy_utils';
import { chaiSetup } from '../../src/utils/chai_setup';
import { constants } from '../../src/utils/constants';
import { AssetProxyId } from '../../src/utils/types';
import { provider, txDefaults, web3Wrapper } from '../../src/utils/web3_wrapper';

chaiSetup.configure();
const expect = chai.expect;
const blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

describe('LibBytes', () => {
    let owner: string;
    let libBytes: TestLibBytesContract;
    const byteArrayShorterThan32Bytes = '0x012345';
    const byteArrayLongerThan32Bytes =
        '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const byteArrayLongerThan32BytesFirstBytesSwapped =
        '0x2301456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const byteArrayLongerThan32BytesLastBytesSwapped =
        '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abefcd';
    let testAddress: string;
    const testBytes32 = '0x102030405060708090a0b0c0d0e0f0102030405060708090a0b0c0d0e0f01020';
    const testUint256 = new BigNumber(testBytes32, 16);
    let shortData: string;
    let shortTestBytes: string;
    let shortTestBytesAsBuffer: Buffer;
    let wordOfData: string;
    let wordOfTestBytes: string;
    let wordOfTestBytesAsBuffer: Buffer;
    let longData: string;
    let longTestBytes: string;
    let longTestBytesAsBuffer: Buffer;

    before(async () => {
        // Setup accounts & addresses
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        owner = accounts[0];
        testAddress = accounts[1];
        // Deploy LibBytes
        libBytes = await TestLibBytesContract.deployFrom0xArtifactAsync(artifacts.TestLibBytes, provider, txDefaults);
        // Verify lengths of test data
        const byteArrayShorterThan32BytesLength = ethUtil.toBuffer(byteArrayShorterThan32Bytes).byteLength;
        expect(byteArrayShorterThan32BytesLength).to.be.lessThan(32);
        const byteArrayLongerThan32BytesLength = ethUtil.toBuffer(byteArrayLongerThan32Bytes).byteLength;
        expect(byteArrayLongerThan32BytesLength).to.be.greaterThan(32);
        const testBytes32Length = ethUtil.toBuffer(testBytes32).byteLength;
        expect(testBytes32Length).to.be.equal(32);
        // Create short test bytes
        shortData = '0xffffaa';
        const encodedShortData = ethUtil.toBuffer(shortData);
        const shortDataLength = new BigNumber(encodedShortData.byteLength);
        const encodedShortDataLength = assetProxyUtils.encodeUint256(shortDataLength);
        shortTestBytesAsBuffer = Buffer.concat([encodedShortDataLength, encodedShortData]);
        shortTestBytes = ethUtil.bufferToHex(shortTestBytesAsBuffer);
        // Create test bytes one word in length
        wordOfData = ethUtil.bufferToHex(assetProxyUtils.encodeUint256(ZeroEx.generatePseudoRandomSalt()));
        const encodedWordOfData = ethUtil.toBuffer(wordOfData);
        const wordOfDataLength = new BigNumber(encodedWordOfData.byteLength);
        const encodedWordOfDataLength = assetProxyUtils.encodeUint256(wordOfDataLength);
        wordOfTestBytesAsBuffer = Buffer.concat([encodedWordOfDataLength, encodedWordOfData]);
        wordOfTestBytes = ethUtil.bufferToHex(wordOfTestBytesAsBuffer);
        // Create long test bytes (combines short test bytes with word of test bytes)
        longData = ethUtil.bufferToHex(Buffer.concat([encodedShortData, encodedWordOfData]));
        const longDataLength = new BigNumber(encodedShortData.byteLength + encodedWordOfData.byteLength);
        const encodedLongDataLength = assetProxyUtils.encodeUint256(longDataLength);
        longTestBytesAsBuffer = Buffer.concat([encodedLongDataLength, encodedShortData, encodedWordOfData]);
        longTestBytes = ethUtil.bufferToHex(longTestBytesAsBuffer);
    });
    beforeEach(async () => {
        await blockchainLifecycle.startAsync();
    });
    afterEach(async () => {
        await blockchainLifecycle.revertAsync();
    });

    describe('areBytesEqual', () => {
        it('should return true if byte arrays are equal (both arrays < 32 bytes)', async () => {
            const areBytesEqual = await libBytes.publicAreBytesEqual.callAsync(
                byteArrayShorterThan32Bytes,
                byteArrayShorterThan32Bytes,
            );
            return expect(areBytesEqual).to.be.true();
        });

        it('should return true if byte arrays are equal (both arrays > 32 bytes)', async () => {
            const areBytesEqual = await libBytes.publicAreBytesEqual.callAsync(
                byteArrayLongerThan32Bytes,
                byteArrayLongerThan32Bytes,
            );
            return expect(areBytesEqual).to.be.true();
        });

        it('should return false if byte arrays are not equal (first array < 32 bytes, second array > 32 bytes)', async () => {
            const areBytesEqual = await libBytes.publicAreBytesEqual.callAsync(
                byteArrayShorterThan32Bytes,
                byteArrayLongerThan32Bytes,
            );
            return expect(areBytesEqual).to.be.false();
        });

        it('should return false if byte arrays are not equal (first array > 32 bytes, second array < 32 bytes)', async () => {
            const areBytesEqual = await libBytes.publicAreBytesEqual.callAsync(
                byteArrayLongerThan32Bytes,
                byteArrayShorterThan32Bytes,
            );
            return expect(areBytesEqual).to.be.false();
        });

        it('should return false if byte arrays are not equal (same length, but a byte in first word differs)', async () => {
            const areBytesEqual = await libBytes.publicAreBytesEqual.callAsync(
                byteArrayLongerThan32BytesFirstBytesSwapped,
                byteArrayLongerThan32Bytes,
            );
            return expect(areBytesEqual).to.be.false();
        });

        it('should return false if byte arrays are not equal (same length, but a byte in last word differs)', async () => {
            const areBytesEqual = await libBytes.publicAreBytesEqual.callAsync(
                byteArrayLongerThan32BytesLastBytesSwapped,
                byteArrayLongerThan32Bytes,
            );
            return expect(areBytesEqual).to.be.false();
        });
    });

    describe('readAddress', () => {
        it('should successfully read address when the address takes up the whole array)', async () => {
            const byteArray = ethUtil.addHexPrefix(testAddress);
            const testAddressOffset = new BigNumber(0);
            const address = await libBytes.publicReadAddress.callAsync(byteArray, testAddressOffset);
            return expect(address).to.be.equal(testAddress);
        });

        it('should successfully read address when it is offset in the array)', async () => {
            const addressByteArrayBuffer = ethUtil.toBuffer(testAddress);
            const prefixByteArrayBuffer = ethUtil.toBuffer('0xabcdef');
            const combinedByteArrayBuffer = Buffer.concat([prefixByteArrayBuffer, addressByteArrayBuffer]);
            const combinedByteArray = ethUtil.bufferToHex(combinedByteArrayBuffer);
            const testAddressOffset = new BigNumber(prefixByteArrayBuffer.byteLength);
            const address = await libBytes.publicReadAddress.callAsync(combinedByteArray, testAddressOffset);
            return expect(address).to.be.equal(testAddress);
        });

        it('should fail if the byte array is too short to hold an address)', async () => {
            const shortByteArray = '0xabcdef';
            const offset = new BigNumber(0);
            return expect(libBytes.publicReadAddress.callAsync(shortByteArray, offset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });

        it('should fail if the length between the offset and end of the byte array is too short to hold an address)', async () => {
            const byteArray = ethUtil.addHexPrefix(testAddress);
            const badOffset = new BigNumber(ethUtil.toBuffer(byteArray).byteLength);
            return expect(libBytes.publicReadAddress.callAsync(byteArray, badOffset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });
    });

    /// @TODO Implement test cases for writeAddress. Test template below.
    ///       Currently, the generated contract wrappers do not support this library's write methods.
    /*
    describe('writeAddress', () => {
        it('should successfully write address when the address takes up the whole array)', async () => {});
        it('should successfully write address when it is offset in the array)', async () => {});
        it('should fail if the byte array is too short to hold an address)', async () => {});
        it('should fail if the length between the offset and end of the byte array is too short to hold an address)', async () => {});
    });
    */

    describe('readBytes32', () => {
        it('should successfully read bytes32 when the bytes32 takes up the whole array)', async () => {
            const testBytes32Offset = new BigNumber(0);
            const bytes32 = await libBytes.publicReadBytes32.callAsync(testBytes32, testBytes32Offset);
            return expect(bytes32).to.be.equal(testBytes32);
        });

        it('should successfully read bytes32 when it is offset in the array)', async () => {
            const bytes32ByteArrayBuffer = ethUtil.toBuffer(testBytes32);
            const prefixByteArrayBuffer = ethUtil.toBuffer('0xabcdef');
            const combinedByteArrayBuffer = Buffer.concat([prefixByteArrayBuffer, bytes32ByteArrayBuffer]);
            const combinedByteArray = ethUtil.bufferToHex(combinedByteArrayBuffer);
            const testAddressOffset = new BigNumber(prefixByteArrayBuffer.byteLength);
            const bytes32 = await libBytes.publicReadBytes32.callAsync(combinedByteArray, testAddressOffset);
            return expect(bytes32).to.be.equal(testBytes32);
        });

        it('should fail if the byte array is too short to hold a bytes32)', async () => {
            const offset = new BigNumber(0);
            return expect(libBytes.publicReadBytes32.callAsync(byteArrayShorterThan32Bytes, offset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });

        it('should fail if the length between the offset and end of the byte array is too short to hold a bytes32)', async () => {
            const badOffset = new BigNumber(ethUtil.toBuffer(testBytes32).byteLength);
            return expect(libBytes.publicReadBytes32.callAsync(testBytes32, badOffset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });
    });

    /// @TODO Implement test cases for writeBytes32. Test template below.
    ///       Currently, the generated contract wrappers do not support this library's write methods.
    /*
    describe('writeBytes32', () => {
        it('should successfully write bytes32 when the address takes up the whole array)', async () => {});
        it('should successfully write bytes32 when it is offset in the array)', async () => {});
        it('should fail if the byte array is too short to hold a bytes32)', async () => {});
        it('should fail if the length between the offset and end of the byte array is too short to hold a bytes32)', async () => {});
    });
    */

    describe('readUint256', () => {
        it('should successfully read uint256 when the uint256 takes up the whole array)', async () => {
            const formattedTestUint256 = new BN(testUint256.toString(10));
            const testUint256AsBuffer = ethUtil.toBuffer(formattedTestUint256);
            const byteArray = ethUtil.bufferToHex(testUint256AsBuffer);
            const testUint256Offset = new BigNumber(0);
            const uint256 = await libBytes.publicReadUint256.callAsync(byteArray, testUint256Offset);
            return expect(uint256).to.bignumber.equal(testUint256);
        });

        it('should successfully read uint256 when it is offset in the array)', async () => {
            const prefixByteArrayBuffer = ethUtil.toBuffer('0xabcdef');
            const formattedTestUint256 = new BN(testUint256.toString(10));
            const testUint256AsBuffer = ethUtil.toBuffer(formattedTestUint256);
            const combinedByteArrayBuffer = Buffer.concat([prefixByteArrayBuffer, testUint256AsBuffer]);
            const combinedByteArray = ethUtil.bufferToHex(combinedByteArrayBuffer);
            const testUint256Offset = new BigNumber(prefixByteArrayBuffer.byteLength);
            const uint256 = await libBytes.publicReadUint256.callAsync(combinedByteArray, testUint256Offset);
            return expect(uint256).to.bignumber.equal(testUint256);
        });

        it('should fail if the byte array is too short to hold a uint256)', async () => {
            const offset = new BigNumber(0);
            return expect(libBytes.publicReadUint256.callAsync(byteArrayShorterThan32Bytes, offset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });

        it('should fail if the length between the offset and end of the byte array is too short to hold a uint256)', async () => {
            const formattedTestUint256 = new BN(testUint256.toString(10));
            const testUint256AsBuffer = ethUtil.toBuffer(formattedTestUint256);
            const byteArray = ethUtil.bufferToHex(testUint256AsBuffer);
            const badOffset = new BigNumber(testUint256AsBuffer.byteLength);
            return expect(libBytes.publicReadUint256.callAsync(byteArray, badOffset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });
    });

    /// @TODO Implement test cases for writeUint256. Test template below.
    ///       Currently, the generated contract wrappers do not support this library's write methods.
    /*
    describe('writeUint256', () => {
        it('should successfully write uint256 when the address takes up the whole array)', async () => {});
        it('should successfully write uint256 when it is offset in the array)', async () => {});
        it('should fail if the byte array is too short to hold a uint256)', async () => {});
        it('should fail if the length between the offset and end of the byte array is too short to hold a uint256)', async () => {});
    });
    */

    describe('readBytes', () => {
        it('should successfully read short, nested array of bytes when it takes up the whole array', async () => {
            const testBytesOffset = new BigNumber(0);
            const bytes = await libBytes.publicReadBytes.callAsync(shortTestBytes, testBytesOffset);
            return expect(bytes).to.be.equal(shortData);
        });

        it('should successfully read short, nested array of bytes when it is offset in the array', async () => {
            const prefixByteArrayBuffer = ethUtil.toBuffer('0xabcdef');
            const shortDataAsBuffer = ethUtil.toBuffer(shortData);
            const combinedByteArrayBuffer = Buffer.concat([prefixByteArrayBuffer, shortTestBytesAsBuffer]);
            const combinedByteArray = ethUtil.bufferToHex(combinedByteArrayBuffer);
            const testUint256Offset = new BigNumber(prefixByteArrayBuffer.byteLength);
            const bytes = await libBytes.publicReadBytes.callAsync(combinedByteArray, testUint256Offset);
            return expect(bytes).to.be.equal(shortData);
        });

        it('should successfully read a nested array of bytes - one word in length - when it takes up the whole array', async () => {
            const testBytesOffset = new BigNumber(0);
            const bytes = await libBytes.publicReadBytes.callAsync(wordOfTestBytes, testBytesOffset);
            return expect(bytes).to.be.equal(wordOfData);
        });

        it('should successfully read a nested array of bytes - one word in length - when it is offset in the array', async () => {
            const prefixByteArrayBuffer = ethUtil.toBuffer('0xabcdef');
            const wordOfDataAsBuffer = ethUtil.toBuffer(wordOfData);
            const combinedByteArrayBuffer = Buffer.concat([prefixByteArrayBuffer, wordOfTestBytesAsBuffer]);
            const combinedByteArray = ethUtil.bufferToHex(combinedByteArrayBuffer);
            const testUint256Offset = new BigNumber(prefixByteArrayBuffer.byteLength);
            const bytes = await libBytes.publicReadBytes.callAsync(combinedByteArray, testUint256Offset);
            return expect(bytes).to.be.equal(wordOfData);
        });

        it('should successfully read long, nested array of bytes when it takes up the whole array', async () => {
            const testBytesOffset = new BigNumber(0);
            const bytes = await libBytes.publicReadBytes.callAsync(longTestBytes, testBytesOffset);
            return expect(bytes).to.be.equal(longData);
        });

        it('should successfully read long, nested array of bytes when it is offset in the array', async () => {
            const prefixByteArrayBuffer = ethUtil.toBuffer('0xabcdef');
            const longDataAsBuffer = ethUtil.toBuffer(longData);
            const combinedByteArrayBuffer = Buffer.concat([prefixByteArrayBuffer, longTestBytesAsBuffer]);
            const combinedByteArray = ethUtil.bufferToHex(combinedByteArrayBuffer);
            const testUint256Offset = new BigNumber(prefixByteArrayBuffer.byteLength);
            const bytes = await libBytes.publicReadBytes.callAsync(combinedByteArray, testUint256Offset);
            return expect(bytes).to.be.equal(longData);
        });

        it('should fail if the byte array is too short to hold the length of a nested byte array)', async () => {
            // The length of the nested array is 32 bytes. By storing less than 32 bytes, a length cannot be read.
            const offset = new BigNumber(0);
            return expect(libBytes.publicReadBytes.callAsync(byteArrayShorterThan32Bytes, offset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });

        it('should fail if we store a nested byte array length, without a nested byte array)', async () => {
            const offset = new BigNumber(0);
            return expect(libBytes.publicReadBytes.callAsync(testBytes32, offset)).to.be.rejectedWith(constants.REVERT);
        });

        it('should fail if the length between the offset and end of the byte array is too short to hold the length of a nested byte array)', async () => {
            const badOffset = new BigNumber(ethUtil.toBuffer(byteArrayShorterThan32Bytes).byteLength);
            return expect(
                libBytes.publicReadBytes.callAsync(byteArrayShorterThan32Bytes, badOffset),
            ).to.be.rejectedWith(constants.REVERT);
        });

        it('should fail if the length between the offset and end of the byte array is too short to hold the nested byte array)', async () => {
            const badOffset = new BigNumber(ethUtil.toBuffer(testBytes32).byteLength);
            return expect(libBytes.publicReadBytes.callAsync(testBytes32, badOffset)).to.be.rejectedWith(
                constants.REVERT,
            );
        });
    });

    /// @TODO Implement test cases for writeUint256. Test template below.
    ///       Currently, the generated contract wrappers do not support this library's write methods.
    /*
    describe('writeBytes', () => {
        it('should successfully write bytes when it takes up the whole array)', async () => {});
        it('should successfully write bytes when it is offset in the array)', async () => {});
        it('should fail if the byte array is too short to hold the nested bytes)', async () => {});
        it('should fail if the length between the offset and end of the byte array is too short to hold the nested bytes)', async () => {});
    });
    */
});