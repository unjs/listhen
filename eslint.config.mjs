import unjs from "eslint-config-unjs";

// https://github.com/unjs/eslint-config
export default unjs({
  ignores: [
  "src/lib"
],
  rules: {
  "unicorn/consistent-destructuring": 0,
  "@typescript-eslint/no-non-null-assertion": 0,
  "unicorn/no-anonymous-default-export": 0,
},
});
