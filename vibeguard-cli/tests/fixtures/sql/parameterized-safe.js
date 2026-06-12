const query = "SELECT * FROM users WHERE username = ?";
db.execute(query, [username]);
const pyQuery = "SELECT * FROM users WHERE username = %s"
