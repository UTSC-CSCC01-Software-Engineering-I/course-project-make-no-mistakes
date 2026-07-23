create policy "Public can read submissions"
on "public"."submissions"
for select
to public
using (
  true
);
