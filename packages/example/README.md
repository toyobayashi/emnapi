```bash
cd ../..
npm install
npm run build
node ./script/release.js

cd ./packages/example
chmod +x ./build.sh
./build.sh

node ./index-emscripten.js
node ./index-wasi.js
```
