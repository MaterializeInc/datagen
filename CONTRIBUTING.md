# Contributor instructions

## Testing

Once you have made the changes to your local copy of the repository, you can run the tests with:

    npm test

Also try to run the script with different options to make sure it works as expected, examples:

    datagen -s ./tests/schema.json -f json -n 10 --record-size 100 --dry-run --debug
    datagen -s ./tests/schema.avsc -f json -n 10 --record-size 100 --dry-run --debug
    datagen -s ./tests/schema.sql -f json -n 10 --record-size 100 --dry-run --debug
    datagen -s ./tests/schema.json -f avro -n 10 --record-size 100 --dry-run --debug
    datagen -s ./tests/schema.avsc -f avro -n 10 --record-size 100 --dry-run --debug
    datagen -s ./tests/schema.sql -f avro -n 10 --record-size 100 --dry-run --debug

## Cutting a new release

Perform a test of the latest code on `main`. See prior section. Then run:

    git tag -a vX.Y.Z -m vX.Y.Z
    git push origin vX.Y.Z
