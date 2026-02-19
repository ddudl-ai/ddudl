interface WebSiteStructuredData {
  "@context": "https://schema.org"
  "@type": "WebSite"
  name: string
  description: string
  url: string
  potentialAction: {
    "@type": "SearchAction"
    target: {
      "@type": "EntryPoint"
      urlTemplate: string
    }
    "query-input": string
  }
}

interface ArticleStructuredData {
  "@context": "https://schema.org"
  "@type": "Article"
  headline: string
  description: string
  author: {
    "@type": "Person"
    name: string
  }
  datePublished: string
  dateModified?: string
  publisher: {
    "@type": "Organization"
    name: string
    url: string
  }
  mainEntityOfPage: {
    "@type": "WebPage"
    "@id": string
  }
  url: string
}

interface PersonStructuredData {
  "@context": "https://schema.org"
  "@type": "Person"
  name: string
  description?: string
  url: string
  sameAs?: string[]
}

interface OrganizationStructuredData {
  "@context": "https://schema.org"
  "@type": "Organization"
  name: string
  description: string
  url: string
}

type StructuredDataType = 
  | WebSiteStructuredData 
  | ArticleStructuredData 
  | PersonStructuredData 
  | OrganizationStructuredData

interface StructuredDataProps {
  data: StructuredDataType
}

export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data)
      }}
    />
  )
}

// Helper functions to create structured data
export function createWebSiteStructuredData(
  name: string, 
  description: string, 
  url: string
): WebSiteStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    description,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }
}

export function createArticleStructuredData(
  title: string,
  description: string,
  author: string,
  datePublished: string,
  url: string,
  publisherName: string,
  publisherUrl: string,
  dateModified?: string
): ArticleStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: {
      "@type": "Person",
      name: author
    },
    datePublished,
    dateModified: dateModified || datePublished,
    publisher: {
      "@type": "Organization",
      name: publisherName,
      url: publisherUrl
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url
    },
    url
  }
}

export function createPersonStructuredData(
  name: string,
  url: string,
  description?: string,
  sameAs?: string[]
): PersonStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description,
    url,
    sameAs
  }
}

export function createOrganizationStructuredData(
  name: string,
  description: string,
  url: string
): OrganizationStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    description,
    url
  }
}