# CREDITS

This project includes ideas and adapted code from several open-source projects.\
In most cases the original code has been modified, optimized, or extended.

## Symbol palette

The symbol palette feature is based on the
[original Overleaf implementation](https://github.com/overleaf/web/tree/master/frontend/js/features/symbol-palette)

The original code was slightly improved, particularly in the parts related to keyboard input.

## LDAP authentication

LDAP authentication was inspired by [this project](https://github.com/smhaller/ldap-overleaf-sl).

The project provided the idea and part of the implementation for adding LDAP users to the user's contacts.

## Real-time track changes and comments

The Track Changes and Comments feature exists largely in the original Overleaf codebase.\
The missing parts were implemented based on [this code](https://github.com/ertuil/overleaf).

The referenced code was fixed, optimized, and extended.

## Sandboxed compiles

The Sandboxed Compiles feature was until recently largely present in the original Overleaf codebase.\
The missing parts were implemented in this project.

## Import file from external URL

The "From External URL" feature exists in the original Overleaf code.\
The missing proxy component was implemented in this project.

## Git integration

The Git integration feature includes parts of the frontend code
from [here](https://github.com/ayaka-notes/overleaf-pro/tree/feat-git-bridge)

## GitHub synchronization

The GitHub synchronization feature includes parts of the frontend code and the OAuth2 backend implementation
from [here](https://github.com/ayaka-notes/overleaf-pro/commit/06a30fe9a0ed75e5ab40b50a8a4e94f43161cf71).

## Sign Up page

The Sign Up page is based on [this code](https://github.com/ayaka-notes/overleaf-pro/tree/feat-public-registeration).

## Instance statistics

The instance statistics feature is based on work from [Isaac Alonso](https://github.com/isaac-aa) (isaac-aa).

## LLM features

The LLM features (AI assistant, compliance review, LLM grammar checking, BYO provider
management) were developed with AI coding assistants: mainly the **pi coding agent**
(using the **qwen3.8-27b** model), and VS Code **Copilot** with Claude, OpenAI and
Raptor Mini models.

[Alessandro Lotti](https://github.com/alelotti96) (alelotti96) worked on part of the LLM work.

## Inspiration

The local-first, self-hosted approach to LaTeX editing was inspired by
[texlyre](https://github.com/texlyre/texlyre) — a local-first LaTeX & Typst web editor
with real-time collaboration and offline support, by
[Fares Abawi](https://github.com/fabawi) (fabawi).

# Acknowledgments

Thanks to the users of the project for valuable feedback, suggestions,
and help in identifying and fixing bugs.
