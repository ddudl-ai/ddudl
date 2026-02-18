import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/settings/', '/profile/'],
    },
    sitemap: 'https://ddudl.com/sitemap.xml',
  }
}