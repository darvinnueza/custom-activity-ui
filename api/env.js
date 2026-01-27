module.exports = (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(
        JSON.stringify({
            SERVICE_BASE: process.env.SERVICE_BASE || ""
        })
    );
};