create policy "Users can insert their own submissions"
on "public"."submissions"
for insert
to authenticated
with check (
  (auth.uid() = user_id)
);
