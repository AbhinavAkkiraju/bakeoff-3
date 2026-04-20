You are *not* required to use Typescript for assignments in DHCS. However, it does often make debugging easier!

To install the Typescript compiler, use npm to globally install typescript:
```
npm install -g typescript
```

Then, from this sub-directory (`ts`), run: 
```shell
tsc --project . --watch
```
The results will be compiled to the `js` folder, which is where the HTML file expects to find them.

You can learn more about Typescript at https://www.typescriptlang.org/
If you use Sublime Text for editing code, I recommend using the "LSP" and "LSP-typescript" packages.