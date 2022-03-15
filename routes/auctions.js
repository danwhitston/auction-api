const express = require('express')
const router = express.Router()

// This matches to the auctions route but only displays API status
// at present. It has no verification and no Mongo model
router.get('/auctions', async(req,res) =>{
    res.status(200).send('Auctions route!')
})

module.exports = router