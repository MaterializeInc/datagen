export default async function* asyncGenerator(iterations) {
    let i = 0;
    // If number is -1, generate infinite records
    if (iterations === -1) {
        while (true) {
            yield i;
            i++;
        }
    } else {
        for (i; i < iterations; i++) {
            yield i;
        }
    }
}
