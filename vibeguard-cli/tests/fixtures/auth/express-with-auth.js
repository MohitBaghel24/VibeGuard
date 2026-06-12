app.get('/api/admin', requireAuth, (req, res) => {
  res.send('Admin panel');
});
