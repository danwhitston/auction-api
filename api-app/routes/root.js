const express = require('express')
const router = express.Router()

// This matches to the root route and only displays API status
// It has no verification and no Mongo model
router.get('/', async(req,res) =>{
    res.status(200).send(`Server is running!`)
})

module.exports = router