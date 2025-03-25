module.exports = {
    content: [
      "./views/**/*.ejs",
      "./public/**/*.js"
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            light: '#5eead4',
            DEFAULT: '#14b8a6',
            dark: '#0f766e',
          },
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
    ],
  }