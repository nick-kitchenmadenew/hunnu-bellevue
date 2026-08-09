# Technical Audit

- Original URL: https://youtu.be/wXn0DIUr06g?si=D9J2u-qMbRCqKSsh
- Canonical URL: https://www.youtube.com/watch?v=wXn0DIUr06g
- Video ID: wXn0DIUr06g
- Uploader: bigCRM- Small Business Growth Interviews

## Transcript

0:02: So, let's talk about a technical audit.

0:03: Now, we're not going to do this for

0:04: every single client. We only do this for

0:05: the largest clients. Uh, and when I say

0:06: largest clients, I mean the clients with

0:07: the largest websites. So, we're going to

0:09: do Screaming Frog. And you can see this

0:10: one is licensed. And that's just because

0:11: if the client is large enough, if their

0:12: website is large enough to justify

0:13: technical audit, they probably have more

0:15: than 500 URLs. Okay. So, uh before we

0:17: actually go through and do it, we're

0:18: going to have to make sure that the page

0:19: speed is uh set up with an API key. So,

0:21: to do that, under configuration, come

0:22: down to API access and hit page speed

0:24: insights. And if you click on this link,

0:26: it'll bring you somewhere where you can

0:27: grab a free API key and you just put it

0:29: in here. Uh, fairly simple to do. Then

0:30: you'll put the homepage here. You'll hit

0:31: start. It'll run. Uh, it'll take quite a

0:33: bit longer than normal because the API

0:34: key with the page speed insights. And

0:35: then we're going to grab a bunch of

0:36: files. So I have the prompt here. So

0:37: we're going to grab internal all. So

0:38: we're going to click internal. And we're

0:40: going to hit export. And we'll

0:41: overwrite.

0:43: And we're going to grab page titles.

0:48: And we're going to grab meta

0:50: descriptions.

0:53: And we're going to grab response codes.

0:59: And we're going to grab images.

1:07: There it is. Export images.

1:10: And after images, we get canonicals and

1:12: structured data. So we'll grab

1:15: canonicals

1:17: and structured data.

1:20: And we grab page speed, links, and

1:21: directives. So page speed, if you didn't

1:23: have the API connected, this would

1:24: basically be blank. So we'll export the

1:25: page speed. We'll export all the links.

1:30: And the last one was directives.

1:35: Okay. So now we'll pull up claude. We'll

1:37: grab the prompt. And these are optional

1:40: from the search console. You can add

1:41: them or not add them. It's really the

1:42: technical audit that we're after here.

1:45: So we'll give it the prompt. So we give

1:47: it the prompt. And then we gave it all

1:48: of these files for Scooing Frog. And

1:51: then we're going to select opus which is

1:52: going to do a much better job at this

1:53: analysis. So I'll run it and pause the

1:55: recording while it is doing the

1:55: analysis. All right. So the analysis is

1:57: done. Took a few minutes and basically

1:59: we have this executive summary that goes

2:00: through the top issues for this

2:01: particular website. Uh generally what we

2:03: would do from here is uh break this uh

2:06: report into different sections. Things

2:07: that my employees need to handle, things

2:09: that I can just give to the developer

2:10: and have them handle it. Um and things

2:11: like that, right? So for example,

2:13: absence of local schema. I'm going to

2:14: kick that over to my employee. Uh she

2:15: knows which web which URLs is going to

2:17: need local schema. We'll have caught

2:18: that with other audits. So this isn't

2:19: super important to catch in this one. I

2:20: agree it is critical but it's so

2:21: critical that we would find it

2:22: otherwise. Uh no geographic keywords and

2:23: title tags. Again we would find this

2:24: through a lot of the other process.

2:25: Mobile page speed failures. This is a

2:27: big one. So uh I could ask claude to

2:28: separate the mobile page speed failures

2:30: into a separate report and I'll just

2:32: give that to the developer and say

2:32: please fix this. Um and yeah and AP

2:35: consistency signals. Again we'll do that

2:36: in other audits that we do. Uh thin

2:38: content on service pages. That's a

2:39: problem. 30% of pages less than 300

2:40: words. So that's definitely something

2:41: that goes to my employee or we're going

2:42: to try to combine uh prune merge or just

2:44: delete some of these thin thin content

2:46: pages. Obviously the no dedicated

2:47: location service area pages will find

2:48: that the content analysis gap. the core

2:49: 30 uh image optimization issues. This is

2:51: another one that we just kick over to

2:52: the developer to fix. Um so basically

2:53: this report just gives you hey here are

2:54: the issues that need to be fixed. Uh

2:56: we'll hand them out to the right team

2:57: members. We have a local health score.

2:59: Uh we can actually have claude generate

3:01: a PDF of this and give it directly to

3:02: the end client. And then once all the

3:03: issues are fixed we can run this again

3:05: generate another PDF where this local

3:06: SEO health score is much higher because

3:07: a lot of these issues are fixed and send

3:08: that also to the client. Uh this will of

3:10: course improve more than just the score.

3:11: A lot of these things are issues that

3:12: need to be fixed if we want to rank in

3:13: highly competitive spaces. Notice this

3:15: is a plastic surgeon in Houston. Okay.

3:16: Again, this type of technical audit is

3:18: not something that we typically do for

3:19: all of our clients. This particular

3:20: client has almost a thousand URLs.

3:23: Actually, I take it back. They have 1400

3:24: URLs. So, this is a big website and

3:25: highly competitive space. That's why

3:26: we're doing this technical audit for

3:27: them. Not every client needs this. Not

3:28: every client gets this, but I just want

3:30: to show you guys how we do a technical

3:31: audit with AI and Screaming Frog.
