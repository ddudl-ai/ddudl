// 이용약관 및 개인정보처리방침 데이터

export const TERMS_VERSION = '2.0'
export const PRIVACY_VERSION = '2.0'

export const TERMS_OF_SERVICE = `
# ddudl Platform Terms of Service

**Effective Date: September 1, 2025**
**Version: ${TERMS_VERSION}**

## Section 1 (Purpose)
These Terms of Service govern the rights, obligations, and responsibilities between ddudl Platform ("Company") and users regarding the use of our AI-based global community platform service ("Service").

## Section 2 (Definitions)
1. "Platform" refers to the online community service operated by the Company.
2. "User" refers to individuals who have entered into a service agreement with the Company under these terms.
3. "Channel" refers to community spaces organized by specific topics.
4. "AI Moderation" refers to automated content review systems using artificial intelligence.

## Section 3 (Terms Effectiveness and Changes)
1. These terms are published and made public on the service interface.
2. The Company may revise these terms without violating applicable laws.
3. When terms are revised, we will announce the effective date and reasons for revision along with the current terms.

## Section 4 (Service Provision)
1. The Company provides the following services:
   - Posting and sharing text, images, videos, and other content
   - Comment and discussion features
   - AI-powered automatic moderation services
   - Personalized content recommendations
   - Token-based reward system

## Section 5 (User Registration)
1. Users apply for membership by filling out the registration form designated by the Company and expressing consent to these terms.
2. The Company may decline registration applications in the following cases:
   - Using false names or others' identities
   - Minors without legal guardian consent
   - Previously banned users

## Section 6 (Privacy Protection)
1. The Company strives to protect users' personal information in accordance with applicable laws.
2. A separate Privacy Policy applies to the protection and use of personal information.

## Section 6-2 (Use of Content for AI Training Data)
1. All content posted by users on this service (posts, comments, images, videos, etc.) may be used as data for AI model training and improvement.
2. The Company may use user-posted content for the following purposes:
   - Training and improving AI language models
   - Improving automatic moderation systems
   - Improving content recommendation algorithms
   - Research and development for service quality improvement
3. Content used for AI training is anonymized by removing personally identifiable information.
4. By agreeing to these terms, users consent to the above usage.
5. If you do not consent to AI training data usage, you cannot use this service.

## Section 7 (AI Moderation)
1. The Company operates AI-based automatic moderation systems to maintain a healthy community environment.
2. Users may appeal AI moderation decisions if they disagree.
3. The Company provides transparency regarding AI moderation results and explains the reasoning behind decisions.

## Section 8 (User Obligations)
1. Users must not engage in the following activities:
   - Stealing others' personal information or posting false information
   - Posting obscene, violent, or illegal content
   - Defaming, slandering, or damaging others' reputation
   - Using the service for commercial activities
   - Disrupting stable service operation

## Section 9 (Service Use Restrictions)
1. The Company may take measures such as warnings, temporary suspensions, or permanent bans when users violate these terms or disrupt normal service operation.
2. The Company will notify users in advance before taking such measures, except in urgent cases where post-notification may apply.

## Section 10 (Liability)
1. The Company is not liable for any damages to users related to the free service, except in cases of gross negligence by the Company.

## Section 11 (Dispute Resolution)
1. The Company and users shall make every effort to amicably resolve disputes related to the service.
2. Disputes regarding these terms shall be governed by Korean law, with Seoul Central District Court having jurisdiction.

## Addendum
These terms are effective from September 1, 2025.
`

export const PRIVACY_POLICY = `
# ddudl Platform Privacy Policy

**Effective Date: September 1, 2025**
**Version: ${PRIVACY_VERSION}**

ddudl Platform ("Company") establishes and discloses this Privacy Policy to protect the personal information of data subjects and enable swift and smooth processing of related complaints.

## Section 1 (Purpose of Personal Information Processing)
The Company processes personal information for the following purposes:

1. **Service Provision**
   - User registration, identity verification, membership services
   - Content provision and personalized services
   - Customer support and complaint handling

2. **Service Improvement**
   - Development of new services and customized services
   - Statistical analysis and academic research

3. **Marketing and Advertising**
   - Event and promotional information delivery
   - Service provision and advertising based on demographic characteristics

4. **AI Training and Service Improvement**
   - Using user-created content as AI model training data
   - Improving automatic moderation systems
   - Improving content recommendation algorithms
   - Research and development for service quality improvement

## Section 2 (Personal Information Items Processed)
The Company processes the following personal information items:

1. **Required Items**
   - Username (nickname)
   - Email hash value (original not stored)
   - Service usage records
   - Access logs, cookies, IP information
   - Posted content (posts, comments, images, videos, etc.)

2. **Optional Items**
   - Profile image
   - Areas of interest

## Section 3 (Processing and Retention Period)
1. **User Information**: Until account deletion (except when required to retain by law)
2. **Service Usage Records**: 3 months
3. **Cookies**: Until browser closure
4. **Log Records**: 3 months

## Section 4 (Third-Party Provision of Personal Information)
The Company does not provide users' personal information to third parties in principle. However, exceptions apply in the following cases:
- When users have given prior consent
- When required by law or requested by investigative authorities according to legal procedures

## Section 5 (Personal Information Processing Delegation)
The Company delegates personal information processing tasks as follows for smooth operations:

1. **Supabase (Database Service)**
   - Delegated Tasks: Data storage and management
   - Retention Period: Until delegation contract termination

2. **Vercel (Hosting Service)**
   - Delegated Tasks: Web service hosting
   - Retention Period: Until delegation contract termination

## Section 6 (Data Subject Rights and Exercise Methods)
Data subjects may exercise the following personal information protection rights with the Company at any time:
1. Request notification of personal information processing status
2. Request access to personal information
3. Request correction or deletion of personal information
4. Request suspension of personal information processing

## Section 7 (Destruction of Personal Information)
1. The Company promptly destroys personal information when it becomes unnecessary due to retention period expiration or purpose fulfillment.
2. **Electronic Files**: Permanent deletion using irreversible methods
3. **Documents and Printouts**: Shredding or incineration

## Section 8 (Personal Information Protection Officer)
The Company designates a Personal Information Protection Officer to oversee personal information processing and handle complaints and remedies:

**Personal Information Protection Officer**
- Name: ddudl Platform Admin
- Contact: privacy@ddudl.com

## Section 9 (Security Measures)
The Company implements the following technical, administrative, and physical security measures:
1. Minimizing and training personal information handling staff
2. Restricting access to personal information
3. Implementing access control measures for database systems storing personal information
4. Installing and regularly updating security programs to prevent information leakage and damage from hacking or computer viruses

## Section 10 (Changes to Privacy Policy)
This Privacy Policy is effective from the implementation date. Changes, additions, deletions, or corrections will be announced at least 7 days prior to implementation.

**Announcement Date**: August 15, 2025
**Effective Date**: September 1, 2025
`

export const MARKETING_CONSENT_TEXT = `
## Marketing Information Consent (Optional)

Would you like to receive various benefits and event information from ddudl Platform?

**Information Content:**
- New feature updates
- Special events and promotional information
- Community activity notifications
- Personalized content recommendations

**Delivery Methods:** Email, in-platform notifications

**Consent Withdrawal:** You can opt out anytime in settings.

※ Declining marketing consent does not restrict service usage.
※ Important service-related announcements will be sent regardless of consent status.
`

export const AI_TRAINING_CONSENT_TEXT = `
## AI Training Data Consent (Required)

To provide better services on ddudl Platform, we would like to use your content for AI training purposes.

**Data Collection and Usage:**
- All text content you post (posts, comments, etc.)
- Images and video content you upload
- Service usage patterns and interaction data

**Usage Purposes:**
- Training and improving AI language models
- Enhancing automatic moderation system accuracy
- Improving content recommendation algorithms
- Research and development for service quality improvement

**Privacy Protection:**
- All content is anonymized by removing personally identifiable information
- AI training data is processed only in secure environments
- Data shared with third parties is provided only in anonymized form

**Important Notice:**
This consent is required for service usage. You cannot use ddudl Platform services without agreeing to this.

You may request to stop AI training usage of your past content through account settings at any time, and such requests will be processed within a reasonable timeframe.
`