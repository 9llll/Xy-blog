/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme")
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
  darkMode: "class", // allows toggling dark mode manually
  theme: {
    extend: {
      fontFamily: {
        // "Maple UI" 已改为 woff2 子集（public/fonts/*.woff2，约 740 KB/字重），
        // 源文件全量 TTF 放在 font-src/ 不参与部署；重新生成见 scripts/build-fonts.py。
        // 若换回系统字体，请同时删掉 Layout.astro 里的 @font-face 与 preload。
        sans: ["Maple UI", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", "WenQuanYi Micro Hei", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
