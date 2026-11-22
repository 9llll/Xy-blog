/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme")
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
  darkMode: "class", // allows toggling dark mode manually
  theme: {
    extend: {
      fontFamily: {
        // 取消 "Maple UI" 排在首位：它是 19.6 MB / 14.8 MB 的全量 TTF，
        // 挂在 html 上等于首屏必然拉一个 34 MB 的字体（实测 60 秒只能下 800 KB），
        // 会长期占用 HTTP 连接、拖慢同域图片与 CSS。
        // 中文字形本身由系统字体渲染质量更好，视觉差异极小。
        // 如需恢复，把 "Maple UI" 加回数组首位，并还原 Layout.astro 里的 @font-face。
        sans: ["PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", "WenQuanYi Micro Hei", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
