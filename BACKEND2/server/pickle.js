import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Parser } from 'pickleparser';

async function unpickle(fname) {
    const pkl = await readFile(join(fname), 'binary');
    const buffer = Buffer.from(pkl, 'binary');
    const parser = new Parser();
    return parser.parse(buffer);
}

// async function obj(){await unpickle('./Health(1).pkl'); return unpickle} 
// console.log(obj());

async function obj() {
    const data = await unpickle('./Health(1).pkl');
    return data; // Return the parsed object
}

obj().then(parsedData => {
    console.log(parsedData); // Log the parsed data
}).catch(err => {
    console.error('Error:', err); // Handle any errors
});
