const knex = require('knex')
const express = require('express')
const { resolve: path } = require('path')
const { renderFile: render } = require('ejs')
const { Client } = require('discord.js')
const settings = require("./settings.json")
const DiscordOAuth = require('discord-oauth2')
const { v4: uuid } = require('uuid')

const db = knex({ client: 'mysql', connection: settings.database })
const app = express()
const oauth = new DiscordOAuth()
const client = new Client()

const sessions = []

db.select('*').from('users_data').then((data) => {
  settings.roles.forEach((role) => {
    if (Object.keys(data[0] || {}).includes(role.id)) return
    db.schema.table('users_data', (tb) => {
      tb.boolean(role.id).defaultTo(role.default || false).notNullable()
    }).then()
  })
})

app.listen(settings.port)
app.get('/auth', (req, res) => {
  oauth
    .tokenRequest({ ...settings.oauth, code: req.query.code })
    .catch(() => {})
    .then((v) => {
      oauth
        .getUser(v.access_token)
        .catch(() => {})
        .then((r) => {
          if (!r) return res.send('error')
          const uid = uuid()
          sessions.push({ uid, id: r.id })
          res.cookie('uid', uid).redirect('/?uid=' + uid)
        })
    })
})
app.use((req, res) => {
  let info = (sessions.find((v) => v.uid === req.query.uid) || { id: 0 }).id
  db.select('*').where({ id: info }).from('users_data').then(([data]) => {
    const { uid, submit, ...ids } = req.query
    if (data && submit === '✔') {
      settings.roles.forEach((r) => {
        if (ids[r.id] === 'on') db.update(r.id, 1).where({ id: info }).from('users_data').then()
        else db.update(r.id, 0).where({ id: info }).from('users_data').then()
      })
      db.select('*').where('id', info).from('users_data').then(([data]) => {
        if (!data) return

        settings.roles.forEach((role) => {
          if (data[role.id]) client.guilds.resolve(settings.guild).members.resolve(info).roles.add(role.id).catch(console.log)
          else client.guilds.resolve(settings.guild).members.resolve(info).roles.remove(role.id).catch(console.log)
        })
      })
      res.redirect('/')
    } else {
      render(path() + '/page/index.ejs', { uid, data, settings }, (err, str) => {
        if (err) console.log(err)
        res.send(str)
      })
    }
  })
})

client.login(settings.token)
client.on('ready', () => {
  client.guilds.resolve(settings.guild).members.cache.forEach((member) => {
    if (member.user.bot) return
    db.select('id').where('id', member.id).from('users_data').then(([data]) => {
      if (!data) db.insert({ id: member.id }).from('users_data').then()
    })
  })
})

client.on('guildMemberAdd', () => {
  client.guilds.resolve(settings.guild).members.cache.forEach((member) => {
    if (member.user.bot) return
    db.select('id').where('id', member.id).from('users_data').then(([data]) => {
      if (!data) db.insert({ id: member.id }).from('users_data').then()
    })
  })
})
