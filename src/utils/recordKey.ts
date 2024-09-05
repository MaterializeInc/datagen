export function accessRecordKey(path: string, record: any): any {
    return path?.split('.').reduce((level, key) => level && level[key], record);
}