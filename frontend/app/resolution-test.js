try {
    require.resolve('tailwindcss-animate');
    console.log('Successfully resolved tailwindcss-animate');
} catch (error) {
    console.error('Failed to resolve tailwindcss-animate:', error.message);
    console.error('Paths checked:', module.paths);
}
