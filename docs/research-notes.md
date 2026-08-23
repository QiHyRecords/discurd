# Product and Design Research Notes

## Functional Reference

Discord’s official role guidance confirms that moderation must respect a top-down role hierarchy: users with role-management authority can affect only lower roles and cannot grant permissions they do not themselves hold. Channel-specific access controls modify the broader server context. LumaLink therefore exposes a pure permission evaluator in the shared domain layer and reserves any production enforcement for Supabase row-level policies and server functions, never for visual state alone.[1]

Discord’s official thread documentation describes threads as conversation subchannels with their own participation and lifecycle. LumaLink presents threads as a focused secondary conversation route with a visible parent-message reference, rather than copying Discord’s interface.[2]

## Interaction and Visual Reference

Apple’s Human Interface Guidelines describe materials as a tool for expressing foreground/background hierarchy. It recommends reserving translucent, navigation-like material for functional layers and avoiding its indiscriminate use within dense content, where semantic standard surfaces better preserve clarity. LumaLink follows that principle with solid content panels, an elevated navigation surface, and limited transparency for transient controls.[3]

## Implementation Consequences

| Area | Decision |
|---|---|
| Permission scope | Evaluate role hierarchy and channel overrides through domain functions; plan server-side RLS and functions as the production authority. |
| Threads | Model parent context, participants, messages, read state, and route state independently from the parent timeline. |
| Navigation | Use a small number of top-level tabs for navigation only; creation and quick actions use separate controls. |
| Materials | Use opacity, elevation, and semantic surfaces sparingly; prioritize contrast and reduced-motion compatibility. |
| Branding | Use LumaLink’s own name, icon, visual tokens, and layout; do not incorporate Discord or Apple marks or proprietary imagery. |

## References

[1]: https://support.discord.com/hc/en-us/articles/214836687-Discord-Roles-and-Permissions "Discord Roles and Permissions"
[2]: https://docs.discord.com/developers/topics/threads "Discord Developer Documentation: Threads"
[3]: https://developer.apple.com/design/human-interface-guidelines/materials "Apple Human Interface Guidelines: Materials"
