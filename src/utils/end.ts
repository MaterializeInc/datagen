import alert from 'cli-alerts';

export default async function end(): Promise<void> {
  alert({
    type: 'warning',
    name: 'Stopping the data generator',
    msg: ''
  });
}
