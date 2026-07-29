// Category: FORMAT-SPECIFIC — sizing/dimension reference pages and specific
// slide-format keywords.
import type { GeneratorPage } from "../types"

export const formatPages: GeneratorPage[] = [
  {
    slug: "linkedin-carousel-size-guide",
    keyword: "LinkedIn Carousel Size Guide",
    h1: "LinkedIn Carousel Size Guide: Choosing the Right Dimensions for Every Post",
    metaTitle: "LinkedIn Carousel Size Guide — Portrait vs. Square | CarouseLabs",
    metaDescription:
      "A practical guide to LinkedIn carousel sizing: why dimensions matter, when to choose portrait over square, and how CarouseLabs sizes every slide for you automatically.",
    intro:
      "Size is one of those carousel decisions that looks minor until you get it wrong — a carousel built at the wrong aspect ratio gets cropped awkwardly in the feed, loses text near the edges, or looks inconsistent from slide to slide. LinkedIn renders document posts inside a fixed viewer, so whatever ratio you pick gets applied uniformly across every slide, and switching mid-carousel isn't possible. This guide walks through why size matters for how LinkedIn actually displays your post, the tradeoffs between the two ratios worth using, and how to decide which one fits your content. Then it covers how CarouseLabs removes the guesswork entirely: you pick a ratio once, and every slide in the set — typically 7 to 9 of them — is generated at that exact size with consistent margins and layout, so nothing gets clipped or stretched.",
    howItWorks: [
      {
        step: "Understand why LinkedIn's viewer forces one size",
        description:
          "LinkedIn's document post viewer locks in the aspect ratio of your first slide and applies it to the entire carousel, with no way to mix portrait and square slides in a single post. That means the sizing decision has to be made upfront, before a single slide is designed, not adjusted after the fact once you've already written or laid out content. Getting it wrong partway through a carousel usually means starting the visual design over, which is exactly the situation this guide is meant to help you avoid.",
      },
      {
        step: "Weigh portrait against square for your content",
        description:
          "A taller, portrait-leaning ratio gives you more vertical room for text-heavy slides, quotes, and step-by-step breakdowns, and it tends to take up more of the mobile screen as people scroll, which can help a post feel more immersive. A square ratio reads as more compact and image-forward, and works well when slides lean on visuals, diagrams, or short punchy statements rather than paragraphs. Neither ratio is objectively better — the right choice depends entirely on how much you're asking each slide to say.",
      },
      {
        step: "Match the ratio to your slide density",
        description:
          "If your outline has slides carrying two or three sentences each, portrait gives that copy room to breathe without shrinking the font past a comfortable reading size on a phone screen. If your slides are closer to single statements, headlines, or icon-driven visuals, square keeps the composition tight and avoids empty space at the top and bottom of each slide. A useful gut check is to picture your densest planned slide and ask which ratio it would look most natural in.",
      },
      {
        step: "Pick your size once in CarouseLabs",
        description:
          "When you generate a carousel, you choose the aspect ratio a single time at the start — CarouseLabs applies it consistently to every slide it designs, so typography, margins, and image framing all line up across the full set. There's no manual resizing or re-exporting individual slides afterward, and no risk of one slide in the set drifting slightly off from the others the way hand-built carousels sometimes do.",
      },
      {
        step: "Review, then post or download",
        description:
          "Once the carousel is generated at your chosen size, review it slide by slide to confirm the ratio suits the content the way you expected. From there, post it directly to LinkedIn from CarouseLabs, or download it and upload it manually as a PDF, which is what triggers LinkedIn's native swipeable document viewer for readers.",
      },
    ],
    useCases: [
      "Creators unsure whether their next carousel should be tall or square before they've even started outlining slide content, and who want a repeatable framework rather than a fresh guess for every post",
      "Marketers standardizing carousel sizing across a team so every post in a shared content calendar looks visually consistent regardless of which team member actually built it",
      "Ghostwriters managing multiple client accounts who need a repeatable sizing decision that doesn't require re-learning LinkedIn's display quirks for every new client brief that comes in",
      "Founders and consultants who've had a carousel look cropped, stretched, or inconsistent in the past and want to understand the underlying reason before publishing another one and repeating the mistake",
      "Anyone comparing a text-heavy educational carousel against a lighter, visual-first one and needing a size that genuinely fits the format they're actually building this time, not just the one they used last time",
    ],
    faq: [
      {
        question: "What size should a LinkedIn carousel be?",
        answer:
          "CarouseLabs generates carousels in one of two sizes: a 4:5 portrait format at 1080x1350px, or a 1:1 square format at 1080x1080px. Portrait suits text-heavier slides since it offers more vertical space, while square suits punchier, visual-first content that doesn't need much room per slide. Whichever you pick applies to every slide in the carousel, since LinkedIn's viewer doesn't support mixing ratios within one post. Choosing between them mostly comes down to how much you expect each individual slide to say, rather than any fixed rule about which one is generally better.",
      },
      {
        question: "Can I change the size after the carousel is generated?",
        answer:
          "The aspect ratio is chosen at the start of the generation flow because it determines the layout of every slide, so it isn't something you swap after the fact within an existing carousel. If you want a different ratio, the straightforward path is generating a new carousel with that size selected from the outset — it only takes a few minutes end to end, and you can reuse the same topic, structure, and style choices you already made, so very little actually has to be redone from scratch.",
      },
      {
        question: "Does the wrong size actually hurt how a carousel performs?",
        answer:
          "An inconsistent or awkward ratio can cause text to sit too close to the edge, images to look stretched, or slides to feel visually mismatched against each other, all of which make a post feel less polished when someone is swiping through quickly on their phone. CarouseLabs avoids this entirely by locking in one size for the full carousel and designing every slide's layout, margins, and typography around it from the very first slide onward, so the finished set looks like one coherent piece of content rather than several patched-together images.",
      },
    ],
    relatedSlugs: [
      "linkedin-carousel-dimensions",
      "linkedin-carousel-maker",
      "linkedin-carousel-template",
      "carousel-slide-generator",
    ],
  },
  {
    slug: "quote-card-generator",
    keyword: "Quote Card Generator",
    h1: "Quote Card Generator: Turn Any Quote Into a Clean, Shareable Visual",
    metaTitle: "Quote Card Generator — Design Quote Visuals with AI | CarouseLabs",
    metaDescription:
      "Turn any quote into a clean, on-brand visual with CarouseLabs' AI image generator. Describe the quote and style you want, or upload a reference, and get an original design in minutes.",
    intro:
      "A quote card is one of the simplest, highest-mileage formats on LinkedIn: a short line of text, set against a clean background, designed to be readable at a glance and easy to save or share. CarouseLabs doesn't have a separate, pre-built \"quote card\" template sitting in a menu somewhere — instead, it's built through the same AI image generator used for any single social image, using a step called the Presentation Structure Decision, which controls how text and visual elements are organized within one image. You describe the quote and the look you want — bold centered text, a soft gradient background, a minimal serif treatment — and the generator designs an original visual around it. If you already have a quote card style you like, you can also upload it as a reference and CarouseLabs will match that layout approach for your new quote.",
    howItWorks: [
      {
        step: "Open the single-image generator",
        description:
          "Quote cards are made through CarouseLabs' AI image generator, the same tool used for any standalone social image, rather than a separate dedicated quote-card feature tucked away in its own menu. This keeps the same style controls and image quality available for a quote visual as for any other single image you'd generate on the platform, so there's no separate, more limited path to work around.",
      },
      {
        step: "Enter the quote as your content",
        description:
          "Type out the exact quote or line you want featured, along with attribution if you want it included, such as a name, title, or source. This becomes the core text the generator designs the entire image around, so getting the wording exact here matters more than in most other steps — the generator won't paraphrase or shorten your quote on its own.",
      },
      {
        step: "Set the Presentation Structure Decision",
        description:
          "This step controls how the text is laid out within the image — where it sits, how much visual weight it carries, and how the rest of the composition supports it. Let AI decide the arrangement, describe what you want in your own words (for example, \"large centered text with a short line underneath for attribution\"), choose from a template, or upload a reference image and have CarouseLabs follow its structure exactly. This is the step that effectively defines what makes it read as a quote card rather than any other kind of single image.",
      },
      {
        step: "Describe the visual style",
        description:
          "Specify the mood, colors, and typography you're picturing — clean and minimal, bold and high-contrast, soft and editorial — using plain descriptive language. Or upload a reference image purely for its visual style, and CarouseLabs will match that look without copying its literal content, text, or composition into your new quote card, so the finished image still feels original to your quote.",
      },
      {
        step: "Generate, review, and download",
        description:
          "CarouseLabs produces an original image built around your quote, chosen structure, and described style. Download it to post directly, or if you don't love the first pass, adjust your style description or structure choice and regenerate as many times as needed until it fits what you had in mind — there's no limit on how many iterations you can run before settling on a final version.",
      },
    ],
    useCases: [
      "Creators who want to break up a week of carousels and long-form posts with a lighter, faster, single-image quote post that still looks intentional and on-brand rather than thrown together",
      "Coaches and consultants turning a memorable line from their own content, a client session, or a talk they gave into a shareable visual worth saving, screenshotting, and sending around",
      "Founders sharing a quote from an investor update, a customer testimonial, or a team member's comment in a clean, on-brand format without opening a separate design tool or hiring anyone",
      "Social media managers who need a fast, no-design-skills way to produce quote visuals that still match an existing brand's colors, typography, and overall visual feel across every post",
      "Anyone who has a specific quote-card style saved from a past post and wants every new quote designed to match that same layout going forward, without redoing the design decisions from scratch each time",
    ],
    faq: [
      {
        question: "Does CarouseLabs have a dedicated quote card template?",
        answer:
          "Not as a separate named feature sitting in its own menu. Quote cards are created using CarouseLabs' general AI image generator, specifically its Presentation Structure Decision step, which governs how text is arranged within any single image. That same underlying mechanism can produce a quote-card-style layout, along with plenty of other single-image formats, depending entirely on how you describe what you want. In other words, the capability exists and works well, but it lives inside the general image generator's structure and style controls rather than under a dedicated \"quote card\" label you'd click into.",
      },
      {
        question: "Can I match a quote card style I've used before?",
        answer:
          "Yes. Upload a past quote card or any reference image when generating a new one, and CarouseLabs will follow its structural layout — where the text sits, how much emphasis it gets, how the background is treated — for your new quote. It matches the structure and style you're referencing without copying the original image's literal content, wording, or attribution, so each new quote card stays original while still looking like it belongs to the same set.",
      },
      {
        question: "Is this the same tool used to make carousels?",
        answer:
          "It's the same underlying AI image generator, used here in single-image mode rather than the multi-slide carousel flow. That means the same style and structure controls apply in both places, so a quote card can share a consistent visual language with a carousel you've already made, as long as you describe the same style when generating each one. This makes it easy to mix quote cards into a broader content calendar built around your carousels.",
      },
    ],
    relatedSlugs: [
      "ai-image-generator-for-linkedin",
      "social-media-image-generator",
      "linkedin-post-image-generator",
      "linkedin-infographic-generator",
    ],
  },
  {
    slug: "linkedin-carousel-dimensions",
    keyword: "LinkedIn Carousel Dimensions",
    h1: "LinkedIn Carousel Dimensions (Exact Pixel Sizes)",
    metaTitle: "LinkedIn Carousel Dimensions — Exact Pixel Sizes | CarouseLabs",
    metaDescription:
      "LinkedIn carousel dimensions: 1080x1350px (4:5 portrait) or 1080x1080px (1:1 square). See both sizes explained, then generate a carousel already sized correctly with CarouseLabs.",
    intro:
      "LinkedIn carousels work at two dimensions: 1080x1350px for a 4:5 portrait layout, or 1080x1080px for a 1:1 square layout. Those are the two sizes CarouseLabs builds carousels at, and they cover the two aspect ratios LinkedIn's document post viewer supports well. Whichever one you pick applies to the entire carousel — LinkedIn doesn't allow mixing ratios within a single post, so every slide, usually 7 to 9 of them, has to share the same pixel dimensions. If you're building slides manually, getting this exact and consistent across every single one is tedious and easy to get slightly wrong. CarouseLabs sets the dimensions automatically the moment you choose your ratio, and every slide it generates comes out at that exact size, with margins and layout already accounted for.",
    howItWorks: [
      {
        step: "The two exact sizes",
        description:
          "4:5 portrait is 1080x1350px. 1:1 square is 1080x1080px. Both are standard, high-resolution dimensions that display cleanly in LinkedIn's feed and document viewer without any downscaling artifacts or compression softness, whether someone's viewing on a phone or a desktop browser. There is no other size CarouseLabs outputs — every carousel is one of these two, chosen upfront.",
      },
      {
        step: "Portrait (1080x1350px) fits more vertical content",
        description:
          "The extra height gives text-heavy slides room to breathe, which is useful for step-by-step breakdowns, longer captions per slide, or quotes with attribution that need a second line. It's the closer of the two to a full-screen mobile read, and it tends to occupy more of the visible feed as someone scrolls past it, which can make a post harder to scroll past without stopping.",
      },
      {
        step: "Square (1080x1080px) is more compact",
        description:
          "Square trims the vertical space, which suits slides built around a single strong statement, an icon, or a simple diagram rather than paragraphs of text. It reads as tighter and more image-forward, and it can feel less demanding to swipe through when the content per slide is intentionally minimal, which some formats benefit from more than others.",
      },
      {
        step: "CarouseLabs sets the pixel dimensions for you",
        description:
          "You choose portrait or square once, at the start of generating a carousel, and CarouseLabs locks every slide to that exact pixel size automatically. There's no manual canvas setup, no resizing between slides, and no risk of one slide coming out a few pixels off from the rest the way it easily can when building slides by hand in a design tool, slide by slide.",
      },
      {
        step: "Export at full resolution",
        description:
          "Slides are generated ready to post directly to LinkedIn or download at full 1080px-wide resolution, so nothing looks soft or pixelated once it's live. Downloading and uploading as a PDF is what activates LinkedIn's native swipeable carousel viewer if you're not posting directly from CarouseLabs to the platform, and the exported file keeps the exact dimensions you generated at.",
      },
    ],
    useCases: [
      "Anyone who searched specifically for the pixel numbers because they're setting up a carousel manually and need exact values before opening a design file and starting from a blank canvas",
      "Designers double-checking dimensions before building a carousel template in an external design tool from scratch, so nothing needs correcting after slides are already laid out",
      "Developers or marketers documenting brand specs who need the precise LinkedIn carousel sizes written down and on record for a team to reference repeatedly across projects",
      "Creators comparing 1080x1350px against 1080x1080px side by side to decide which fits an upcoming post's specific content before committing to either one",
      "Teams standardizing carousel exports so every file matches LinkedIn's expected dimensions exactly before it ever gets uploaded, avoiding rejected, cropped, or misformatted posts going live",
    ],
    faq: [
      {
        question: "What are the exact pixel dimensions for a LinkedIn carousel?",
        answer:
          "1080x1350px for 4:5 portrait, or 1080x1080px for 1:1 square. These are the two sizes CarouseLabs generates carousels in, and both are sized to display at full clarity in LinkedIn's feed and document viewer without any resizing needed after export. There isn't a third supported size — every carousel on the platform effectively falls into one of these two exact pixel ratios, and CarouseLabs never outputs anything outside them.",
      },
      {
        question: "Which dimension should I use, portrait or square?",
        answer:
          "1080x1350px portrait gives more vertical room and suits slides carrying more text per slide, like step-by-step explanations. 1080x1080px square is more compact and suits punchier, visual-first slides that don't need as much space. Either way, the same dimension applies to every slide in the carousel, since LinkedIn doesn't support mixing ratios in one document post, so it's worth deciding based on your densest planned slide rather than your lightest one before generating anything.",
      },
      {
        question: "Do I need to set these dimensions manually?",
        answer:
          "No. CarouseLabs asks you to choose portrait or square once when you start generating a carousel, then applies the exact corresponding pixel size — 1080x1350px or 1080x1080px — to every slide automatically. You never have to set up a canvas, calculate margins, or check dimensions by hand at any point, even if you're generating carousels regularly across many different topics and campaigns.",
      },
    ],
    relatedSlugs: [
      "linkedin-carousel-size-guide",
      "linkedin-carousel-maker",
      "carousel-slide-generator",
      "pdf-to-linkedin-carousel",
    ],
  },
  {
    slug: "carousel-slide-generator",
    keyword: "Carousel Slide Generator",
    h1: "Carousel Slide Generator: Fix or Refine One Slide Without Redoing the Whole Carousel",
    metaTitle: "Carousel Slide Generator — Regenerate a Single Slide | CarouseLabs",
    metaDescription:
      "Don't like one slide in an otherwise-good carousel? CarouseLabs lets you regenerate a single slide with a custom instruction, without touching the rest of the carousel.",
    intro:
      "Most of the time, a generated carousel comes back close to right — except for one slide that doesn't quite land. Maybe the background is too busy, the text is too dense, or the visual doesn't match the point you're making. Redoing the entire carousel over one weak slide wastes the seven or eight slides that were already fine. CarouseLabs' carousel slide generator solves that specific problem: instead of only being able to regenerate a whole carousel at once, you can select a single slide and regenerate just that one, with a custom instruction describing exactly what should change. The rest of the carousel stays untouched — same content, same layout, same visual style — while the one slide you flagged gets redesigned to match your note. It's the fastest way to take a carousel from almost right to done.",
    howItWorks: [
      {
        step: "Generate your carousel as usual",
        description:
          "Start from a topic, a custom description, or a reference image, and let CarouseLabs produce the full 7-9 slide carousel with its usual consistent typography, color, and layout across every slide. This first pass is where most of the carousel comes together correctly, and it's what the single-slide tool works on top of afterward.",
      },
      {
        step: "Review the full set slide by slide",
        description:
          "Look through the generated carousel and identify any individual slide that isn't working — whether that's the visual, the way the text is arranged, or the overall tone of that one slide compared to the rest of the set. Most of the time it's a single slide, not the whole carousel, that needs attention, often the opening hook or a slide carrying a specific data point.",
      },
      {
        step: "Select the one slide to change",
        description:
          "Instead of regenerating the whole carousel from scratch, pick just the slide that needs work. Every other slide in the set is left exactly as it is, including its content, layout, and visual style, so none of the progress on the slides that were already right gets lost or has to be reviewed again from scratch.",
      },
      {
        step: "Give it a custom instruction",
        description:
          "Describe specifically what should change on that slide — for example, \"make this slide's background darker,\" \"simplify the layout,\" or \"make the headline bigger and remove the icon.\" CarouseLabs regenerates only that slide based on your instruction, using the same underlying topic and style as the rest of the carousel as context, so the result still fits the set.",
      },
      {
        step: "Review and repeat if needed",
        description:
          "Check the updated slide against the rest of the carousel for visual and tonal consistency. If it's still not quite right, give another instruction and regenerate that same slide again, as many times as it takes, without ever affecting the other slides in the set or requiring you to start the whole carousel over.",
      },
    ],
    useCases: [
      "Creators who like eight out of nine slides in a carousel and don't want to lose that progress by regenerating the entire carousel over one weak slide",
      "Marketers fixing a slide that misrepresents a stat, feature, or claim without needing to re-approve or touch the rest of an otherwise-finished carousel",
      "Teams doing a final visual pass before publishing and catching one slide that clashes with the tone or design of the rest of the set",
      "Anyone refining a specific slide's wording or layout after feedback from a colleague or client, one targeted change at a time instead of starting over",
      "Creators who reuse a favorite carousel structure repeatedly and consistently only need to touch up the one slide that tends to vary each time, like an opening hook",
    ],
    faq: [
      {
        question: "Can I regenerate just one slide in a carousel?",
        answer:
          "Yes. CarouseLabs lets you select an individual slide within an already-generated carousel and regenerate only that one, using a custom instruction to describe the exact change you want. The rest of the carousel's slides stay completely unaffected by that change, so you never have to redo work that was already fine just to fix one part of the set.",
      },
      {
        question: "Will regenerating one slide change the layout or style of the others?",
        answer:
          "No. Only the slide you select gets regenerated. The remaining slides keep their existing content, layout, and visual style exactly as they were before, so a single-slide fix doesn't risk introducing inconsistency, color drift, or layout mismatches across the rest of the carousel, even after several rounds of edits on that one slide.",
      },
      {
        question: "How specific should my instruction be when fixing a slide?",
        answer:
          "The more specific, the better the result — instead of a vague note like \"make it better,\" describe the actual change you want, such as \"reduce the amount of text\" or \"use a warmer color palette on this slide.\" You can regenerate the same slide multiple times with refined instructions until it lands exactly right, without any extra cost to the slides you've already approved.",
      },
    ],
    relatedSlugs: [
      "linkedin-carousel-maker",
      "ai-carousel-generator",
      "linkedin-carousel-dimensions",
      "topic-to-carousel-generator",
    ],
  },
  {
    slug: "multi-slide-post-generator",
    keyword: "Multi-Slide Post Generator",
    h1: "Multi-Slide Post Generator: Create the Swipeable Post Format for LinkedIn",
    metaTitle: "Multi-Slide Post Generator — Make Swipeable LinkedIn Posts | CarouseLabs",
    metaDescription:
      "Create the swipe-through, multi-slide LinkedIn post format without design work. CarouseLabs writes and designs the whole set of slides from a single idea.",
    intro:
      "If you've noticed the LinkedIn posts that show up as a set of slides you swipe through, rather than a single image or block of text, that format has a specific name — a carousel — but plenty of people searching for it just know it as \"the post with multiple slides.\" It's one of the better-performing formats on LinkedIn because it rewards attention: each swipe is a fresh moment for someone to keep going or stop. Building one from scratch normally means writing out the content slide by slide and then designing each one to look consistent with the rest, which is where most people give up partway through. CarouseLabs turns a single idea into a complete multi-slide post automatically — you provide the topic, choose how the story should flow across slides, and the tool writes and designs the full set, ready to post.",
    howItWorks: [
      {
        step: "Start with your idea",
        description:
          "Type in what you want the post to be about — a lesson, an opinion, a how-to, a story from your week. You don't need it pre-structured into slides; a rough idea, even a few loose sentences, is enough for CarouseLabs to work from, and there's no minimum amount of detail required to get started.",
      },
      {
        step: "Choose how the slides should flow",
        description:
          "Pick how the information should be broken across slides — let AI decide the flow automatically, choose from over 30 proven slide-flow templates spanning 12 categories of content, describe your own structure in plain language, or point it at a reference post and have it follow that structure instead. This decision shapes how your idea gets paced across the swipe.",
      },
      {
        step: "Set your visual style",
        description:
          "Decide how the slides should look — colors, typography, illustration style — either by describing it in your own words or by uploading a reference image whose visual style CarouseLabs will match without copying its actual content or wording into your new post. This is what keeps every slide in the set looking like it belongs together.",
      },
      {
        step: "Get the full set generated at once",
        description:
          "CarouseLabs writes the caption and designs the entire multi-slide set — usually 7 to 9 slides — with consistent visuals across every one, choosing either a 4:5 portrait or 1:1 square size applied uniformly to the whole set from the first slide to the last. Nothing needs to be assembled or laid out by hand afterward.",
      },
      {
        step: "Post it or download it",
        description:
          "Post the finished set directly to LinkedIn from CarouseLabs, or download it and upload it manually as a PDF, which is what triggers LinkedIn's native swipe-through viewer for the format once it's live in someone's feed. Either path gets you to the same finished, swipeable post.",
      },
    ],
    useCases: [
      "People who want to make the swipeable, multi-slide LinkedIn format but weren't sure what it's officially called or how it actually gets built",
      "First-time posters trying the format for the first time without wanting to learn a design tool from scratch just to make one post",
      "Creators who've seen the format perform well in their own feed and want to try it for their own ideas, stories, or lessons learned",
      "Small business owners explaining a product, an offer, or a process to customers in a plain, step-by-step, swipe-through way rather than one dense caption",
      "Anyone who wants a single idea turned into a complete, ready-to-post set of slides without writing or designing each individual one by hand",
    ],
    faq: [
      {
        question: "What is this multi-slide post format actually called?",
        answer:
          "On LinkedIn, it's officially called a carousel, or a document post. \"Multi-slide post\" describes the same thing in plainer terms — a set of slides someone swipes through in the feed instead of viewing a single image or reading a block of text straight through. If you search for a carousel maker instead, you'll land on the same underlying tool, since the two terms point at the same format.",
      },
      {
        question: "Do I have to plan out each slide myself?",
        answer:
          "No. You provide the overall idea and choose a structure — or let CarouseLabs decide the structure for you entirely — and it writes and designs the individual slides itself, including how the idea develops from one slide to the next. There's no need to draft slide-by-slide content in advance before generating anything, which is usually the part that stalls people out when building the format by hand.",
      },
      {
        question: "How many slides does a typical multi-slide post have?",
        answer:
          "Most well-performing posts in this format land between 7 and 9 slides — enough to properly open, develop, and close an idea without losing the reader partway through the swipe. CarouseLabs determines the exact count based on how much your specific topic actually needs to say, rather than forcing every idea into the same length regardless of how much substance it has.",
      },
    ],
    relatedSlugs: [
      "linkedin-carousel-maker",
      "topic-to-carousel-generator",
      "text-to-carousel-generator",
      "free-linkedin-carousel-maker",
    ],
  },
]
