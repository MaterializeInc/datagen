import cryptoRandomString from 'crypto-random-string';

export default async function recordSize(): Promise<string> {
    let payload: string;
    if (global.recordSize) {
        if (global.recordSize <= 0) {
            global.recordSize = 1;
        }
        payload = cryptoRandomString({
            length: global.recordSize,
            type: 'base64'
        });
    }
    return payload;
}
