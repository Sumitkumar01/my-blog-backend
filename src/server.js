import fs from 'fs';
import admin from 'firebase-admin';
import express from "express";
import { db, connectTODb } from './db.js'; 


const credentials = JSON.parse(
    fs.readFileSync('../credentials.json')
);

admin.initializeApp({
    credential:admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());

app.use( async (req, res, next) => {
    const { authtoken } = req.headers;

    if (authtoken) {
        try {
            const user = await admin.auth().verifyIdToken(authtoken);
            req.user = user;
        }catch(e){
            res.sendStatus(400);
        }
    }
    next();
});

app.get('/api/articles/:name', async (req, res) => {
    const { name } = req.params;

    const { uid } = req.user;    
    
    const article = await db.collection('articles').findOne({ name });

    if (article) {
        const upvoteIds = article.upvoteIds || [];
        article.canUpvote = uid && !upvoteIds.include(uid);
        res.json(article);
    }else{
        res.sendStatus(404);
    }
    
});

app.put('/api/articles/:name/upvote', async (req, res) => {
    const { name } = req.params;

    
    await db.collection('articles').updateOne({ name }, {
        $inc: { upvote:1 },
    });
    const article = await db.collection('articles').findOne({ name });

    if (article) {
        res.json(article);

    }else {
        res.send('articles are not vote!')
    }    
});
app.post('/api/articles/:name/comments', async (req,res) => {
    const { name } =req.params;
    const { postedBy, text } = req.body;

   
    await db.collection('articles').updateOne({ name },{
        $push: { comments: { postedBy, text }},
    });
    const article = await db.collection('articles').findOne({ name });

    if (article) {
        res.json(article);
    }else {
        res.send('articles are no comments!');
    }
});

connectTODb( () => {
    console.log('Database is connected !');
    app.listen(8000,() => {
        console.log('server is running on 8000 !');
    });
})

