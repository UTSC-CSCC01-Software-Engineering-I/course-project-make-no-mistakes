const express = require("express"); 
const app = express();
const cors = require("cors");
const corsOptions = {
	origin: ["http://localhost:5173"],
}
const { createClient } = require("@supabase/supabase-js")

app.use(cors(corsOptions));

app.get("/auth/confirm", async function (req, res) {
        const token_hash = req.query.token_hash
        const type = req.query.type
        const next = req.query.next ?? "/"
        if (token_hash && type) {
                const supabase = createClient({ req, res })
                const { error } = await supabase.auth.verifyOtp({
                        type,
                        token_hash,
                })
                if (!error) {
                        res.redirect(303, `/${next.slice(1)}`)
                }
        }
        // return the user to an error page with some instructions
        res.redirect(303, '/auth/auth-code-error')
})

app.listen(8080, () => {
        console.log("Server has started listening on port 8080");
});

app.use((req, res, next) => {
  res.status(404).send("The page you are looking for does not exist");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});