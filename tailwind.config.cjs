/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme")
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
  darkMode: "class", // allows toggling dark mode manually
  theme: {
    extend: {
      fontFamily: {
        // "Maple UI" 是全量 TTF（maple-ui.ttf 19.6 MB / maple-ui-bold.ttf 14.8 MB），
        // 挂在根元素上意味着首屏会请求该字体。换系统字体更省流量，
        // 但会改变全站字体的观感，如需切换请同时删掉 Layout.astro 里的 @font-face。
        sans: ["Maple UI", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", "WenQuanYi Micro Hei", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
