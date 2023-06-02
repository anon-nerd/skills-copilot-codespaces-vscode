// Create web server 
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');
const app = express();
// Middleware
app.use(bodyParser.json());
app.use(cors());
// Create comments object
const commentsByPostId = {};
// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});
// Post comments by post id
app.post('/posts/:id/comments', async (req, res) => {
    // Generate random id
    const commentId = randomBytes(4).toString('hex');
    // Get comment data
    const { content } = req.body;
    // Get comments by post id
    const comments = commentsByPostId[req.params.id] || [];
    // Add comment to comments
    comments.push({ id: commentId, content, status: 'pending' });
    // Add comments to commentsByPostId
    commentsByPostId[req.params.id] = comments;
    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });
    // Send response
    res.status(201).send(comments);
});
// Handle events
app.post('/events', async (req, res) => {
    // Get event type
    const { type, data } = req.body;
    // If comment is moderated
    if (type === 'CommentModerated') {
        // Get comment
        const { postId, id, status, content } = data;
        // Get comments by post id
        const comments = commentsByPostId[postId];
        // Find comment
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        // Update comment
        comment.status = status;
        // Send event to event bus
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                status,
                postId,
                content
            }
        });
    }
    // Send response
    res