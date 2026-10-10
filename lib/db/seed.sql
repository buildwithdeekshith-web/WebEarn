BEGIN;
INSERT INTO webearn_users (id,email,name,role,bio,category,location,availability,skills,portfolio_links) VALUES
('demo-business-bakery','baker@demo.webearn.test','Mira Patel','business','Neighborhood bakery making naturally leavened bread and seasonal pastries.','Food & drink','Pune, India','',ARRAY[]::text[],ARRAY[]::text[]),
('demo-business-studio','hello@demo.webearn.test','Rohan Mehta','business','Independent salon focused on thoughtful cuts and low-waste products.','Beauty & wellness','Mumbai, India','',ARRAY[]::text[],ARRAY[]::text[]),
('demo-business-tutor','learn@demo.webearn.test','Ananya Rao','business','Small tutoring studio helping middle-school students feel confident in maths.','Education','Bengaluru, India','',ARRAY[]::text[],ARRAY[]::text[]),
('demo-student-asha','asha@demo.webearn.test','Asha Nair','student','Frontend developer who makes accessible, friendly websites for local businesses.','Student developer','Kochi, India','Available for 2 projects',ARRAY['React','TypeScript','Accessibility'],ARRAY['https://example.com/asha-portfolio']),
('demo-student-kabir','kabir@demo.webearn.test','Kabir Shah','student','Designer-developer building fast, mobile-first storefronts.','Student developer','Ahmedabad, India','Available next month',ARRAY['Web design','Shopify','CSS'],ARRAY['https://example.com/kabir-portfolio']),
('demo-student-leela','leela@demo.webearn.test','Leela Iyer','student','A student developer who enjoys translating a brand into a clear web experience.','Student developer','Chennai, India','Available now',ARRAY['React','Figma','SEO'],ARRAY['https://example.com/leela-portfolio']),
('demo-admin','admin@demo.webearn.test','WebEarn Admin','admin','Demo administrator account.','','','',ARRAY[]::text[],ARRAY[]::text[])
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_projects (id,business_id,title,category,about,required_pages,required_features,min_budget,max_budget,deadline,reference_links,notes,status,student_id,preview_url,payment_status,created_at) VALUES
(101,'demo-business-bakery','A warm website for our neighborhood bakery','Food & drink','We need a welcoming website that makes it easy to discover our bread, see our opening hours, and place a celebration order.','{Home,Menu,About,Contact}','{Mobile-friendly,Order enquiry form,Google Maps}',180,350,'2026-11-20','{https://example.com/reference-cafe}','We already have photos and a logo ready.','open',NULL,NULL,'not_funded',NOW()-INTERVAL '2 days'),
(102,'demo-business-studio','Give our salon a fresh online home','Beauty & wellness','A simple, polished salon website with service details, our team and an easy path to booking.','{Home,Services,Team,Contact}','{Booking link,Instagram gallery,Mobile-friendly}',220,450,'2026-11-29','{https://example.com/reference-salon}','Please keep it easy for us to update.','active','demo-student-asha','https://preview.example.com/sunroom','held',NOW()-INTERVAL '8 days'),
(103,'demo-business-tutor','Tutoring studio website with class enquiry','Education','Parents need to understand our teaching approach and get in touch to ask about classes.','{Home,Subjects,About,Contact}','{Enquiry form,Testimonials,Mobile-friendly}',200,400,'2026-11-05','{}','Warm and reassuring, not too school-like.','submitted','demo-student-kabir','https://preview.example.com/brightpath','held',NOW()-INTERVAL '12 days'),
(104,'demo-business-bakery','Seasonal gift-box landing page','Food & drink','A landing page for our festive pastry boxes, with a menu and clear pre-order information.','{Landing page,Menu,Contact}','{Pre-order form,Mobile-friendly}',150,300,'2026-11-15','{}','Open for admin review if anything is unclear.','disputed','demo-student-leela',NULL,'disputed',NOW()-INTERVAL '15 days'),
(105,'demo-business-studio','Portfolio site for a local photographer','Creative services','A lightweight portfolio to show recent work, packages, and contact details.','{Home,Gallery,Packages,Contact}','{Image gallery,Contact form,Mobile-friendly}',180,320,'2026-10-02','{}','Keep gallery images easy to replace.','completed','demo-student-asha','https://example.com/portfolio-project','released',NOW()-INTERVAL '25 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_proposals (id,project_id,student_id,message,quote,timeline_days,portfolio_links,status) VALUES
(201,102,'demo-student-asha','I can create a clean mobile-first salon site and connect your existing booking link. I will share a first preview before final delivery.',310,12,'{https://example.com/asha-portfolio}','accepted'),
(202,101,'demo-student-kabir','I would love to help your bakery put its menu and story online. I can bring a warm visual direction and make the enquiry flow simple.',260,10,'{https://example.com/kabir-portfolio}','pending'),
(203,101,'demo-student-leela','I can build a fast, accessible site that helps customers find your hours, menu and celebration ordering details.',290,14,'{https://example.com/leela-portfolio}','pending'),
(204,103,'demo-student-kabir','I can make a clear and reassuring site for parents, with subject information and a straightforward enquiry form.',300,12,'{https://example.com/kabir-portfolio}','accepted'),
(205,104,'demo-student-leela','I can make your seasonal gift boxes easy to browse and pre-order, with a page that works well on phones.',220,9,'{https://example.com/leela-portfolio}','accepted'),
(206,105,'demo-student-asha','I can make your photography portfolio feel clear and image-led, with a simple contact path.',240,10,'{https://example.com/asha-portfolio}','accepted')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_milestones (id,project_id,title,due_date,completed) VALUES
(301,102,'Confirm brand and content','2026-10-13',1),(302,102,'Share first website preview','2026-10-21',0),(303,102,'Final handoff','2026-10-28',0),
(304,103,'Approve page outline','2026-10-15',1),(305,103,'Review website preview','2026-10-23',0),(306,103,'Final delivery','2026-11-01',0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_messages (id,project_id,sender_id,text,created_at) VALUES
(401,102,'demo-business-studio','I have added the service descriptions and team photos to the shared brief.',NOW()-INTERVAL '1 day'),
(402,102,'demo-student-asha','Thanks! I have started the first layout and will share a preview this week.',NOW()-INTERVAL '20 hours'),
(403,103,'demo-student-kabir','The first version is ready for a review. I have included the enquiry form and subject pages.',NOW()-INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_submissions (id,project_id,url,note,kind,created_at) VALUES
(501,103,'https://preview.example.com/brightpath','First version is ready for your feedback.','preview',NOW()-INTERVAL '4 hours'),
(502,105,'https://example.com/portfolio-project','Final responsive site, ready for handoff.','final',NOW()-INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_disputes (id,project_id,opened_by,reason,status,resolution,created_at) VALUES
(601,104,'demo-business-bakery','The submitted page does not include the agreed pre-order form, and we have not been able to agree on a delivery date.','open',NULL,NOW()-INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_payments (id,project_id,amount,status,updated_at) VALUES
(701,102,310,'held',NOW()-INTERVAL '8 days'),(702,103,300,'held',NOW()-INTERVAL '12 days'),(703,104,220,'disputed',NOW()-INTERVAL '15 days'),(704,105,240,'released',NOW()-INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webearn_reviews (id,project_id,reviewer_id,subject_id,rating,comment,created_at) VALUES
(801,105,'demo-business-studio','demo-student-asha',5,'A thoughtful, reliable collaborator. The site is easy to use and we received great feedback from customers.',NOW()-INTERVAL '19 days'),
(802,105,'demo-student-asha','demo-business-studio',5,'Clear feedback and a lovely business to work with. The project brief made it easy to get started.',NOW()-INTERVAL '19 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('webearn_projects','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_projects),1));
SELECT setval(pg_get_serial_sequence('webearn_proposals','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_proposals),1));
SELECT setval(pg_get_serial_sequence('webearn_milestones','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_milestones),1));
SELECT setval(pg_get_serial_sequence('webearn_messages','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_messages),1));
SELECT setval(pg_get_serial_sequence('webearn_submissions','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_submissions),1));
SELECT setval(pg_get_serial_sequence('webearn_disputes','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_disputes),1));
SELECT setval(pg_get_serial_sequence('webearn_payments','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_payments),1));
SELECT setval(pg_get_serial_sequence('webearn_reviews','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM webearn_reviews),1));
COMMIT;
