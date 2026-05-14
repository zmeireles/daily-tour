## Product description

### Context

This is a tourism area product. Guesthouses are located in an Island. The island is S. Miguel, Archipelago of Azores - Portugal. It's called "The green Island" - This is important for Design System options

### Frontend

PWA (progressive web app - or pwa) to be used by tourists hosted in one of several guest houses belonging to the same owner. The goal is to provide the users (the tourists/guests) meaningful information about places of interest to visit. The "interest" and "place" are key here: Interest is a "complex goal" and place is where or what can enable fulfilling the goal. For example: goal is "dinner close to the sea", then "place" would have to match that interest. An interest can be decomposed in an "action" and "wish". The pwa should list places grouped by common pre-defined/pre-loaded/hardcoded top level interests (actions). UX is a key feature, so the list of places by interest should be short or long enough to be quickly assimilated by the common human brain, it should also be wide enough to fulfill the available "wishes" in each action. Another criteria is the relation between the place and a location. We can have 2 locations for each user (user must be related to a specific guesthouse): The user current location and the guesthouse location. If user don't allow share of loaction with the pwa, then allways use the guesthouse location as reference. If both locations are available then default to one and allow the user to switch between, causing the list to refresh. Range (distance) from location is a prop (shown and user enabled to change).

In each list group there should be an option to dig in (explore), leading to a more focused exploration of the selected "action". This 2nd level list would group places by "whish" (pre-defined/hardcoded). Any list should allow customization like sort order (by name), ungrouping/grouping, stars, etc.

Clicking a place would lead to a detail page with main photo and multimedia gallery (photos and videos), contacts (phone, email, social links, etc), description, reputation, comments, and other useful information like address and location in a map (actual map with the place pinned in the center). The detail page should also have Actions like: "navigate me there"; "Make a call"; "draft a reservation DM using <social-network/whatsapp,...>; "Use AI agent to make a reservation".

In addition the pwa should have a "Daily tour"/"One day tour" action. This action would lead to a page containing: A form (to get user preferences); A large voice enabled text input area and a "Submit to Agent" button. Upon form and text submission the AI agent would plan a tour. The tour should include meals at usual times unless told otherwise. The duration, starting and ending time should also be part of the form with valid pre-filled values (exclude the past or extend it past the checkout date - its part of the token used in the pwa URL).

PWA accessed by the domain name only should land in a special page with some information about the platform and generic information based on the browser location/device IP. But no premium functionalities.

PWA in the premium access (URL with a token) should also include the owner information (see bellow)

PWA should also include a contact owner section (with easy access). The contact options should follow the backend enabled/defined options (phone call, DM)

Chat conversations between the user and the owner should be in RT. DM or chat with the owner should be pwa channel agnostic (backend deals with that)

Other features:

- dark and light themes - default to a theme based on daytime access
- locale selector

## Backend

The pwa backend should:

- CRUD of guesthouses - full information (location, name, address multimedia, etc.)
- enable input of guest entries (guesthouse, name related with the reservation, preferred locale, checking and checkout, etc.)
- generate access URL by reservation to be given to each guest
- scan the internet for candidate places to be inserted after approval. The search should include a coordinate reference point and a soft range in km or by area (district/country, etc).
- let the owner pre-approve places for more in-deep research
- let the user approve place and content to publish in the public access and premium access
- let the owner input data about himself - including photo/video to be exposed in the premium access
- let the owner provide and enable/disable phone contact for direct voice contact from the pwa
- let the owner provide and enable/disable the text channel details for DM exchange with the pwa. (Telegram/whatsapp).

## Architecture

- Docker compose based microservices
- Optimized architecture - Startup level
- Prepared to grow (for example include RabbitMQ from day 1)

## Tech Stack Guidelines

### Generic

- OSS
- Latest stable versions
- Qual and Prod server ubuntu 24 based - to be aquired

### Libraries, languages, frameworks

- ReactJS
- Typescript (and python in the case of python backend(s))
- Tailwindcss, i18n, shadcn/ui, motion
- Backends in Node or Python - you choose according with purpose, pros and cons
- Authentik
- n8n
- postgreSQL
- pgvector

### Restrictions - Rules

- NO NextJS or Tanstack SSR
- Before including **any** library or framework check for discovered exploits, patches, versions affected, etc

## Other

- TDD
- Use of stitch mcp-server to define Design System
- locales should be: pt-PT, en, fr, es, de
