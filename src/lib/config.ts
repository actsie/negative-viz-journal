export const config = {
  demo: {
    client: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
    server: process.env.DEMO_MODE === 'true'
  }
}