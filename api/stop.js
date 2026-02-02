module.exports = (req, res) => {
  console.log("PATH:", req.url);
  console.log("BODY:", JSON.stringify(req.body ?? {}, null, 2));
  res.status(200).json({ ok: true });
};