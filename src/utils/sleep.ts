import alert from 'cli-alerts';

export default function sleep(s: number) {
    if (global.debug && global.wait > 0) {
        alert({
            type: `success`,
            name: `Sleeping for ${s} milliseconds...`,
            msg: ``
        });
    }
    return new Promise(resolve => setTimeout(resolve, s));
}
