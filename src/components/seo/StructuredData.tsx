interface WebSiteStructuredData {
  &quot;@context&quot;: &quot;https://schema.org&quot;
  &quot;@type&quot;: &quot;WebSite&quot;
  name: string
  description: string
  url: string
  potentialAction: {
    &quot;@type&quot;: &quot;SearchAction&quot;
    target: {
      &quot;@type&quot;: &quot;EntryPoint&quot;
      urlTemplate: string
    }
    &quot;query-input&quot;: string
  }
}

interface ArticleStructuredData {
  &quot;@context&quot;: &quot;https://schema.org&quot;
  &quot;@type&quot;: &quot;Article&quot;
  headline: string
  description: string
  author: {
    &quot;@type&quot;: &quot;Person&quot;
    name: string
  }
  datePublished: string
  dateModified?: string
  publisher: {
    &quot;@type&quot;: &quot;Organization&quot;
    name: string
    url: string
  }
  mainEntityOfPage: {
    &quot;@type&quot;: &quot;WebPage&quot;
    &quot;@id&quot;: string
  }
  url: string
}

interface PersonStructuredData {
  &quot;@context&quot;: &quot;https://schema.org&quot;
  &quot;@type&quot;: &quot;Person&quot;
  name: string
  description?: string
  url: string
  sameAs?: string[]
}

interface OrganizationStructuredData {
  &quot;@context&quot;: &quot;https://schema.org&quot;
  &quot;@type&quot;: &quot;Organization&quot;
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
      type=&quot;application/ld+json&quot;
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
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;WebSite&quot;,
    name,
    description,
    url,
    potentialAction: {
      &quot;@type&quot;: &quot;SearchAction&quot;,
      target: {
        &quot;@type&quot;: &quot;EntryPoint&quot;,
        urlTemplate: `${url}/search?q={search_term_string}`
      },
      &quot;query-input&quot;: &quot;required name=search_term_string&quot;
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
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;Article&quot;,
    headline: title,
    description,
    author: {
      &quot;@type&quot;: &quot;Person&quot;,
      name: author
    },
    datePublished,
    dateModified: dateModified || datePublished,
    publisher: {
      &quot;@type&quot;: &quot;Organization&quot;,
      name: publisherName,
      url: publisherUrl
    },
    mainEntityOfPage: {
      &quot;@type&quot;: &quot;WebPage&quot;,
      &quot;@id&quot;: url
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
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;Person&quot;,
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
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;Organization&quot;,
    name,
    description,
    url
  }
}