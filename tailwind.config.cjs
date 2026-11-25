/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme")
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
  darkMode: "class", // allows toggling dark mode manually
  theme: {
    extend: {
      fontFamily: {
        // "Maple UI" 现在按字频分片（public/fonts/maple-ui/*.woff2 + src/styles/maple-ui.css），
        // 浏览器只下本页用到的片，约 40–150 KB。重新生成：scripts/build-fonts-split.py
        // 若换回系统字体，请同时删掉 Layout.astro 里的 preload 与 maple-ui.css 的 import。
        sans: ["Maple UI", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", "WenQuanYi Micro Hei", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
