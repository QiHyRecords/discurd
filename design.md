# LumaLink Mobile Interface Design

## Product Direction

LumaLink is an original Android community and direct-messaging product inspired by the specification's functional scope, but it does not reproduce Discord or Apple branding, assets, or layouts. The first release is a **local-first, backend-ready experience**: all principal flows work with an included demo workspace and persist local preferences, while `supabase/` supplies the schema, policies, and service interfaces needed to replace the local repository with Supabase.

The primary target is a 9:16 portrait Android phone used one-handed. Screens preserve a calm, high-contrast visual hierarchy derived from human-interface principles: strong headings, deliberate whitespace, tactile press feedback, short grouped lists, and action sheets for secondary controls. Large phones and tablets retain the same navigation semantics with proportionate gutters rather than fixed positions.

## Screen List and Primary Content

| Screen | Content and functionality | Layout and one-handed considerations |
|---|---|---|
| Welcome and account setup | Brand mark, sign-in and create-account actions, age acknowledgement, terms and privacy links. | One primary action in the lower thumb zone; legal content remains accessible as secondary text links. |
| Home | Greeting, unread activity, recent conversations, favourite spaces, active call card, and quick compose action. | Scrollable dashboard with a fixed tab bar and a floating compose control above the bottom edge. |
| Inbox | Direct messages, group chats, read state, presence, search entry point, and a new-message action. | Virtualized conversation list; swipe-independent row actions and prominent search. |
| Conversation | Timeline, replies, reactions, read receipts, typing indicator, composer, attachment and voice affordances. | Composer is anchored above the keyboard; long press opens a native-feeling action sheet. |
| Thread | Parent-message context, participant summary, thread timeline, and focused composer. | Presented as a full-screen route so message context is readable on a phone. |
| Spaces | User spaces, discoverable space card, create/join entry points, and unread indicators. | A compact list replaces a Discord-style rail; names and activity are the primary wayfinding signals. |
| Space overview | Banner, description, member count, favourites, grouped text/voice channels, member and settings shortcuts. | Collapsible channel groups reduce scanning; create actions are visible only when allowed by the local permission engine. |
| Channel | Channel timeline and composer, matching the direct-message conversation interaction model. | Shared timeline components prevent behavior drift between DMs and channels. |
| People | Friends, requests, blocks, status chips, and profile entry. | Segmented filter is near the top and contact actions use explicit buttons rather than gesture-only controls. |
| Calls | Current and recent calls, contact entry, participant state, speaker/mic/video control model. | A live call is a focused route with large 48-point controls along the lower edge. |
| Search | Search input, scope chips, recent searches, people/channel/message result groups. | Search opens from every major content area and preserves the return route. |
| Notifications | Grouped messages, mentions, friend, call, and system events. | Each item is a direct deep link target; grouped sections prevent overwhelming the list. |
| Profile | Avatar, status, bio, shared spaces, actions to message/block/report. | Presented as an accessible full-screen sheet; primary contact action is within thumb reach. |
| Settings | Grouped Account, Privacy, Notifications, Appearance, Accessibility, Voice & Video, Data, Security, and About rows. | Native-style grouped list with descriptive values, toggles, and drill-down routes. |
| Policy and data rights | Privacy policy, terms, community rules, export-data and delete-account request surfaces. | Important actions require confirmation and are separated from routine settings. |

## Key User Flows

| User goal | Flow |
|---|---|
| Start using LumaLink | Welcome → create profile → confirm age and policies → Home → optional notification prompt → empty-state guidance. |
| Send a direct message | Inbox → select person or new message → Conversation → type message → send → pending/sent state and local read update. |
| Reply or react | Conversation → long press a message → select Reply or reaction → composer reference appears or reaction updates. |
| Browse a community | Spaces → choose a space → Space overview → expand Text/Voice group → choose a channel → Channel timeline. |
| Manage a space | Space overview → settings shortcut → Roles & permissions → review inherited capability state → update local preview. |
| Handle an invite | Deep link route → invite details → join confirmation → Space overview. The later Supabase/Android App Links service resolves a real token. |
| Change visual preference | Settings → Appearance → select system, light, or dark → semantic token system persists selection. |
| Connect a backend later | Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` → run supplied SQL migrations → replace `LocalCommunityRepository` with `SupabaseCommunityRepository` according to `BACKEND_SETUP.md`. |

## Color and Material Choices

| Token | Light mode | Dark mode | Purpose |
|---|---:|---:|---|
| Aurora | `#4966E8` | `#8FA7FF` | Primary controls, links, unread emphasis. |
| Night ink | `#111326` | `#F3F4FF` | Main typography. |
| Cloud | `#F5F6FB` | `#0F1020` | Screen background. |
| Panel | `#FFFFFF` | `#1A1B31` | Lists, cards, bottom navigation material. |
| Mist | `#E7E9F5` | `#2A2D47` | Separators, subdued fills, grouped settings. |
| Mint signal | `#198B72` | `#50C7A8` | Presence and successful actions. |
| Coral alert | `#C84558` | `#FF8998` | Destructive actions, failed delivery, warnings requiring attention. |

Surfaces use an opaque base with a restrained translucent overlay rather than pervasive blur. Corner radii are 14–24 points according to elevation. Text uses a stable 1.25–1.4 line-height, 44-point minimum touch targets, and no information is distinguished by colour alone.

## Architecture Boundaries

The user-facing app should not hold privileged backend credentials. Interfaces in `lib/community` make the UI depend on domain types and repository methods, rather than on a particular storage technology. A local repository delivers the included experience; the supplied Supabase SQL migration, RLS policies, edge-function templates, and integration guide define the production replacement path. Realtime voice/video, push delivery, CAPTCHA, 2FA, moderation queues, and rate limits are documented as server-integrated capabilities and are not represented as falsely live features in the local build.
