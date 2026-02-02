/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable dark mode support
    theme: {
        extend: {
            colors: {
                // Semantic colors can be added here
            }
        },
    },
    plugins: [],
}
