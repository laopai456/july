App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-5gl9tqz7860b840c",
      dataImported: false
    }
    
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力")
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      })
    }
    
    this.checkAndImportData()
  },

  checkAndImportData: async function () {
    const db = wx.cloud.database()
    
    try {
      const countRes = await db.collection('movies').count()
      
      if (countRes.total === 0) {
        console.log('数据库为空，开始自动导入数据...')
        await this.importAllData()
      } else {
        console.log('数据库已有', countRes.total, '条数据')
        this.globalData.dataImported = true
      }
    } catch (err) {
      console.error('检查数据失败:', err)
    }
  },

  importAllData: async function () {
    const db = wx.cloud.database()
    
    const varietyData = [
      { title: 'Running Man', region: 'kr', year: 2010, rating: 8.6, genres: ['真人秀', '游戏'] },
      { title: '新西游记', region: 'kr', year: 2015, rating: 9.5, genres: ['真人秀', '旅行'] },
      { title: '无限挑战', region: 'kr', year: 2005, rating: 9.6, genres: ['真人秀', '搞笑'] },
      { title: '认识的哥哥', region: 'kr', year: 2015, rating: 8.8, genres: ['真人秀', '脱口秀'] },
      { title: '向往的生活', region: 'cn', year: 2017, rating: 7.6, genres: ['真人秀', '生活'] },
      { title: '我独自生活', region: 'kr', year: 2013, rating: 8.9, genres: ['真人秀', '生活'] },
      { title: '种地吧', region: 'cn', year: 2023, rating: 8.9, genres: ['真人秀', '生活'] },
      { title: '极限挑战', region: 'cn', year: 2015, rating: 8.8, genres: ['真人秀', '游戏'] },
      { title: '明星大侦探', region: 'cn', year: 2016, rating: 9.0, genres: ['真人秀', '推理'] },
      { title: '一年一度喜剧大赛', region: 'cn', year: 2021, rating: 8.6, genres: ['喜剧', '竞技'] },
      { title: '心动的信号', region: 'cn', year: 2018, rating: 7.5, genres: ['真人秀', '恋爱'] },
      { title: '换乘恋爱', region: 'kr', year: 2021, rating: 8.7, genres: ['真人秀', '恋爱'] },
      { title: '快乐再出发', region: 'cn', year: 2022, rating: 9.6, genres: ['真人秀', '旅行'] },
      { title: '花儿与少年', region: 'cn', year: 2014, rating: 7.8, genres: ['真人秀', '旅行'] },
      { title: '爸爸去哪儿', region: 'cn', year: 2013, rating: 8.9, genres: ['真人秀', '亲子'] },
      { title: '我是歌手', region: 'cn', year: 2013, rating: 8.2, genres: ['真人秀', '音乐'] },
      { title: '中国好声音', region: 'cn', year: 2012, rating: 7.8, genres: ['真人秀', '音乐'] },
      { title: '奔跑吧', region: 'cn', year: 2014, rating: 7.2, genres: ['真人秀', '游戏'] },
      { title: '蒙面唱将', region: 'cn', year: 2016, rating: 8.0, genres: ['真人秀', '音乐'] },
      { title: '声入人心', region: 'cn', year: 2018, rating: 9.1, genres: ['真人秀', '音乐'] }
    ]

    const movieData = [
      { title: '流浪地球2', titleEn: 'The Wandering Earth 2', region: 'cn', year: 2023, rating: 8.3, genres: ['科幻', '灾难'], poster: 'https://image.tmdb.org/t/p/w500/1E5baD5ov4k9hF5L1AqW6B1U.jpg' },
      { title: '满江红', titleEn: 'Full River Red', region: 'cn', year: 2023, rating: 7.0, genres: ['悬疑', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/4hbfQLWQk7MeHhQHt0FaTbSE3.jpg' },
      { title: '消失的她', titleEn: 'Lost in the Stars', region: 'cn', year: 2023, rating: 7.2, genres: ['悬疑', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/qhb1qOl2k4a0OvMzn3wYdcR4l6.jpg' },
      { title: '封神第一部', titleEn: 'Creation of the Gods I', region: 'cn', year: 2023, rating: 7.8, genres: ['奇幻', '动作'], poster: 'https://image.tmdb.org/t/p/w500/m0gM9lRfWp4t0pT6sBhX7LzEz.jpg' },
      { title: '奥本海默', titleEn: 'Oppenheimer', region: 'us', year: 2023, rating: 8.8, genres: ['传记', '历史'], poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XEGykav9rL2p7lC.jpg' },
      { title: '芭比', titleEn: 'Barbie', region: 'us', year: 2023, rating: 7.6, genres: ['喜剧', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51DbkovO7A.jpg' },
      { title: '蜘蛛侠：纵横宇宙', titleEn: 'Spider-Man: Across the Spider-Verse', region: 'us', year: 2023, rating: 8.9, genres: ['动画', '动作'], poster: 'https://image.tmdb.org/t/p/w500/8Vt6mIzeJ4HyxqaTmMJE8gJMP.jpg' },
      { title: '首尔之春', titleEn: '12.12: The Day', region: 'kr', year: 2023, rating: 8.8, genres: ['历史', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/1YQ5cElJmA6hGhBmP8rZ8gJiY.jpg' },
      { title: '犯罪都市3', titleEn: 'The Roundup: No Way Out', region: 'kr', year: 2023, rating: 7.5, genres: ['动作', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/5mzr6J3vzaYFVY6q2PmKtUSeR.jpg' },
      { title: '千寻小姐', titleEn: 'Call Me Chihiro', region: 'jp', year: 2023, rating: 7.8, genres: ['剧情', '治愈'], poster: 'https://image.tmdb.org/t/p/w500/4Zb4ZgG8rYqE7yZqYbLkX3e0.jpg' },
      { title: '你的名字', titleEn: 'Your Name', region: 'jp', year: 2016, rating: 8.4, genres: ['爱情', '动画'], poster: 'https://image.tmdb.org/t/p/w500/q719jpXXxPDDqmpdOOZfYVbJg.jpg' },
      { title: '铃芽之旅', titleEn: 'Suzume', region: 'jp', year: 2022, rating: 8.0, genres: ['动画', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/lSqrQPgQf0uLhJcMv4xuZfJCg.jpg' },
      { title: '灌篮高手', titleEn: 'The First Slam Dunk', region: 'jp', year: 2022, rating: 8.3, genres: ['动画', '运动'], poster: 'https://image.tmdb.org/t/p/w500/hi0w2BVdPwAvLrC6l3dMP6wB.jpg' },
      { title: '银河护卫队3', titleEn: 'Guardians of the Galaxy Vol. 3', region: 'us', year: 2023, rating: 8.0, genres: ['动作', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/r2J0xdp8jlor4Zd4fzLmJgaG.jpg' },
      { title: '速度与激情10', titleEn: 'Fast X', region: 'us', year: 2023, rating: 7.0, genres: ['动作', '冒险'], poster: 'https://image.tmdb.org/t/p/w500/fiVW068FjQZvPvM9XwzwDZxwQ.jpg' },
      { title: '变形金刚：超能勇士崛起', titleEn: 'Transformers: Rise of the Beasts', region: 'us', year: 2023, rating: 7.0, genres: ['动作', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/gPbMNPv6X6F4wBrKvYhWc3S2v.jpg' },
      { title: '碟中谍7', titleEn: 'Mission: Impossible - Dead Reckoning Part One', region: 'us', year: 2023, rating: 7.8, genres: ['动作', '冒险'], poster: 'https://image.tmdb.org/t/p/w500/NNxYKcY5q7r5dWqwW2S4Qy6.jpg' },
      { title: '夺宝奇兵5', titleEn: 'Indiana Jones and the Dial of Destiny', region: 'us', year: 2023, rating: 6.8, genres: ['动作', '冒险'], poster: 'https://image.tmdb.org/t/p/w500/Af4bFW6Xpb8RgKlvfM5M2taD.jpg' },
      { title: '小美人鱼', titleEn: 'The Little Mermaid', region: 'us', year: 2023, rating: 6.5, genres: ['奇幻', '爱情'], poster: 'https://image.tmdb.org/t/p/w500/ym1dxyrGssNZaGxq8XqbZpGyV.jpg' },
      { title: '蚁人与黄蜂女：量子狂潮', titleEn: 'Ant-Man and the Wasp: Quantumania', region: 'us', year: 2023, rating: 6.2, genres: ['动作', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/ngl2FKBlU4CbKMvWTtcFw0f3k.jpg' },
      { title: '疯狂元素城', titleEn: 'Elemental', region: 'us', year: 2023, rating: 7.1, genres: ['动画', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/4Y1WNyd88hTQ1l8qX3GqVbXgD.jpg' },
      { title: '超级马力欧兄弟大电影', titleEn: 'The Super Mario Bros. Movie', region: 'us', year: 2023, rating: 7.1, genres: ['动画', '冒险'], poster: 'https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5bI.jpg' },
      { title: '疾速追杀4', titleEn: 'John Wick: Chapter 4', region: 'us', year: 2023, rating: 7.7, genres: ['动作', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/vZloFAKL7mH0f4yOBKsj8Zf9J.jpg' },
      { title: '惊声尖叫6', titleEn: 'Scream VI', region: 'us', year: 2023, rating: 6.5, genres: ['恐怖', '悬疑'], poster: 'https://image.tmdb.org/t/p/w500/wDWwtvkfVzYzVwYcLtA8qXjBd.jpg' },
      { title: '阿凡达：水之道', titleEn: 'Avatar: The Way of Water', region: 'us', year: 2022, rating: 7.6, genres: ['科幻', '冒险'], poster: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSme5JLBBm.jpg' },
      { title: '黑豹2', titleEn: 'Black Panther: Wakanda Forever', region: 'us', year: 2022, rating: 6.8, genres: ['动作', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/sv1xAdU0delPpe1S7pjOk96w.jpg' },
      { title: '壮志凌云2', titleEn: 'Top Gun: Maverick', region: 'us', year: 2022, rating: 8.3, genres: ['动作', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpI0aNBr5FAMHg.jpg' },
      { title: '侏罗纪世界3', titleEn: 'Jurassic World Dominion', region: 'us', year: 2022, rating: 5.7, genres: ['动作', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/kAVRgw7GgK1Cf3tSy8d3GwvM.jpg' },
      { title: '奇异博士2', titleEn: 'Doctor Strange in the Multiverse of Madness', region: 'us', year: 2022, rating: 7.0, genres: ['动作', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/9Gtg2Kw6Kj8e1zCUxSrPE2iK.jpg' },
      { title: '新蝙蝠侠', titleEn: 'The Batman', region: 'us', year: 2022, rating: 7.7, genres: ['动作', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36FvHf5wCZZ3B9R.jpg' },
      { title: '雷神4', titleEn: 'Thor: Love and Thunder', region: 'us', year: 2022, rating: 6.3, genres: ['动作', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/pIkRyDxklAhF4FhO5jOe4qZ.jpg' },
      { title: '子弹列车', titleEn: 'Bullet Train', region: 'us', year: 2022, rating: 7.3, genres: ['动作', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/j9mH1pr4XdJGqWGC3zDVbXU3.jpg' },
      { title: '不', titleEn: 'Nope', region: 'us', year: 2022, rating: 6.9, genres: ['恐怖', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/AcKVlWaEmqVZfFvG9wK3XvR4l.jpg' },
      { title: '猫王', titleEn: 'Elvis', region: 'us', year: 2022, rating: 7.4, genres: ['传记', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/oNyP2D5qXLh5VQHv3s2tWuQY.jpg' },
      { title: '悲情三角', titleEn: 'Triangle of Sadness', region: 'us', year: 2022, rating: 7.0, genres: ['喜剧', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/moI9mcSb0KdSbL4v5nA9oT1j.jpg' },
      { title: '鲸', titleEn: 'The Whale', region: 'us', year: 2022, rating: 7.7, genres: ['剧情'], poster: 'https://image.tmdb.org/t/p/w500/jQ0gylMctucuM4fskI6cJ8mY.jpg' },
      { title: '瞬息全宇宙', titleEn: 'Everything Everywhere All at Once', region: 'us', year: 2022, rating: 7.8, genres: ['动作', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/w3LxiV37cAn1z5dGdWw7RWwG.jpg' },
      { title: '利刃出鞘2', titleEn: 'Glass Onion: A Knives Out Mystery', region: 'us', year: 2022, rating: 7.1, genres: ['悬疑', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/vDGr1YdEqMjJd9v0T8tCSYwz0.jpg' },
      { title: '达荷美女战士', titleEn: 'The Woman King', region: 'us', year: 2022, rating: 6.9, genres: ['动作', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/7cS6Vt4tpgZd7iXJYd9z3bR.jpg' },
      { title: '黑亚当', titleEn: 'Black Adam', region: 'us', year: 2022, rating: 6.4, genres: ['动作', '科幻'], poster: 'https://image.tmdb.org/t/p/w500/3E5gDZ1vWV0VhXf5pYrLsDxqz.jpg' },
      { title: '尼罗河上的惨案', titleEn: 'Death on the Nile', region: 'us', year: 2022, rating: 6.3, genres: ['悬疑', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/4XgLx8fYvJmI4PjKzLjC1nT.jpg' },
      { title: '北欧人', titleEn: 'The Northman', region: 'us', year: 2022, rating: 7.1, genres: ['动作', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/zhLKlUaF1SE1BQkMwL8Cx4u5.jpg' },
      { title: '灰影人', titleEn: 'The Gray Man', region: 'us', year: 2022, rating: 6.5, genres: ['动作', '惊悚'], poster: 'https://image.tmdb.org/t/p/w500/8cGf1g3dJvN6P2iXdJd8vZfF.jpg' },
      { title: '不速之客', titleEn: 'The Unbearable Weight of Massive Talent', region: 'us', year: 2022, rating: 7.0, genres: ['动作', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/1BXx7bZdWkG1yHnc7LmQjNwv.jpg' },
      { title: '迷失之城', titleEn: 'The Lost City', region: 'us', year: 2022, rating: 6.5, genres: ['动作', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/b6qloLQjHqDx1TmWjJpVZlyL.jpg' },
      { title: '天才不能承受之重', titleEn: 'The Unbearable Weight of Massive Talent', region: 'us', year: 2022, rating: 7.0, genres: ['动作', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/1BXx7bZdWkG1yHnc7LmQjNwv.jpg' },
      { title: '青春变形记', titleEn: 'Turning Red', region: 'us', year: 2022, rating: 7.0, genres: ['动画', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/qsdjZWcYqmbvCddNqT3kBCdPn.jpg' }
    ]

    const dramaData = [
      { title: '漫长的季节', titleEn: 'The Long Season', region: 'cn', year: 2023, rating: 9.4, genres: ['悬疑', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/uKvVmmGQ7f5sUw8cYqnvDQrP7r.jpg' },
      { title: '狂飙', titleEn: 'The Knockout', region: 'cn', year: 2023, rating: 8.5, genres: ['剧情', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/1M876KPj6E4tzWzVZ6U8XnL3Y.jpg' },
      { title: '三体', titleEn: 'Three-Body', region: 'cn', year: 2023, rating: 8.7, genres: ['科幻', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/lFf6LLrQjYldcZItzOkGmMMdP.jpg' },
      { title: '去有风的地方', titleEn: 'Meet Yourself', region: 'cn', year: 2023, rating: 8.3, genres: ['爱情', '治愈'], poster: 'https://image.tmdb.org/t/p/w500/4dOvQYwdqChw0f0p0cDm6nJxT.jpg' },
      { title: '黑暗荣耀', titleEn: 'The Glory', region: 'kr', year: 2022, rating: 9.0, genres: ['剧情', '复仇'], poster: 'https://image.tmdb.org/t/p/w500/mODdcQjLQ3kLpGbcP4kxx4IDM.jpg' },
      { title: '请回答1988', titleEn: 'Reply 1988', region: 'kr', year: 2015, rating: 9.7, genres: ['剧情', '家庭'], poster: 'https://image.tmdb.org/t/p/w500/5U9Vz4BLqLrJq1z8M5nCJkVhk.jpg' },
      { title: '孤单又灿烂的神-鬼怪', titleEn: 'Goblin', region: 'kr', year: 2016, rating: 8.8, genres: ['爱情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/5EipYcWZP9Q9VQqTfjzuA2GxL.jpg' },
      { title: '太阳的后裔', titleEn: 'Descendants of the Sun', region: 'kr', year: 2016, rating: 8.2, genres: ['爱情', '动作'], poster: 'https://image.tmdb.org/t/p/w500/1S6jxq9VxGhNkzXf4L5FhjZJ.jpg' },
      { title: '来自星星的你', titleEn: 'My Love from the Star', region: 'kr', year: 2013, rating: 8.2, genres: ['爱情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/7Wg6N1yYyBcLxJdWjyYx5fTlQ.jpg' },
      { title: '继承者们', titleEn: 'The Heirs', region: 'kr', year: 2013, rating: 7.8, genres: ['爱情', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/9XfSjYkWfVQ6PqZjHxJQXkLk.jpg' },
      { title: '蓝色大海的传说', titleEn: 'The Legend of the Blue Sea', region: 'kr', year: 2016, rating: 8.1, genres: ['爱情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/5kV4h6nXqYqZvL5f8Jf7YqJq.jpg' },
      { title: '信号', titleEn: 'Signal', region: 'kr', year: 2016, rating: 8.6, genres: ['悬疑', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/2gB9C6wQjVfVvZvZvZvZvZvZv.jpg' },
      { title: '秘密森林', titleEn: 'Stranger', region: 'kr', year: 2017, rating: 8.5, genres: ['悬疑', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/3jQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '天空之城', titleEn: 'Sky Castle', region: 'kr', year: 2018, rating: 8.6, genres: ['剧情', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/4kQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '梨泰院Class', titleEn: 'Itaewon Class', region: 'kr', year: 2020, rating: 8.2, genres: ['剧情', '爱情'], poster: 'https://image.tmdb.org/t/p/w500/5kQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '鱿鱼游戏', titleEn: 'Squid Game', region: 'kr', year: 2021, rating: 8.0, genres: ['剧情', '惊悚'], poster: 'https://image.tmdb.org/t/p/w500/dDlEmi3kOPQOkxiS8b4G8LmY.jpg' },
      { title: '非常律师禹英禑', titleEn: 'Extraordinary Attorney Woo', region: 'kr', year: 2022, rating: 8.1, genres: ['剧情', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/vZxVfHvB0rCQYqYqYqYqYqYq.jpg' },
      { title: '财阀家的小儿子', titleEn: 'Reborn Rich', region: 'kr', year: 2022, rating: 7.8, genres: ['剧情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/6kQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '黑暗荣耀2', titleEn: 'The Glory Part 2', region: 'kr', year: 2023, rating: 9.0, genres: ['剧情', '复仇'], poster: 'https://image.tmdb.org/t/p/w500/mODdcQjLQ3kLpGbcP4kxx4IDM.jpg' },
      { title: '医生们', titleEn: 'Doctors', region: 'kr', year: 2016, rating: 7.8, genres: ['爱情', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/7kQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '举重妖精金福珠', titleEn: 'Weightlifting Fairy Kim Bok-joo', region: 'kr', year: 2016, rating: 8.3, genres: ['爱情', '喜剧'], poster: 'https://image.tmdb.org/t/p/w500/8kQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '当你沉睡时', titleEn: 'While You Were Sleeping', region: 'kr', year: 2017, rating: 8.1, genres: ['爱情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/9kQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '德鲁纳酒店', titleEn: 'Hotel del Luna', region: 'kr', year: 2019, rating: 8.0, genres: ['爱情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/1aQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '爱的迫降', titleEn: 'Crash Landing on You', region: 'kr', year: 2019, rating: 8.7, genres: ['爱情', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/2bQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '王国', titleEn: 'Kingdom', region: 'kr', year: 2019, rating: 8.3, genres: ['动作', '恐怖'], poster: 'https://image.tmdb.org/t/p/w500/3cQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '僵尸校园', titleEn: 'All of Us Are Dead', region: 'kr', year: 2022, rating: 7.5, genres: ['动作', '恐怖'], poster: 'https://image.tmdb.org/t/p/w500/4dQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '我的解放日志', titleEn: 'My Liberation Notes', region: 'kr', year: 2022, rating: 8.8, genres: ['剧情', '爱情'], poster: 'https://image.tmdb.org/t/p/w500/5eQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '二十五，二十一', titleEn: 'Twenty-Five Twenty-One', region: 'kr', year: 2022, rating: 8.6, genres: ['爱情', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/6fQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '异能', titleEn: 'Moving', region: 'kr', year: 2023, rating: 8.5, genres: ['动作', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/7gQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '与恶魔有约', titleEn: 'My Demon', region: 'kr', year: 2023, rating: 7.8, genres: ['爱情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/8hQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '欢迎回到三达里', titleEn: 'Welcome to Samdal-ri', region: 'kr', year: 2023, rating: 8.0, genres: ['爱情', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/9hQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '死期将至', titleEn: 'Death\'s Game', region: 'kr', year: 2023, rating: 8.3, genres: ['奇幻', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/1bQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '杀人者的难堪', titleEn: 'A Killer Paradox', region: 'kr', year: 2024, rating: 7.5, genres: ['悬疑', '犯罪'], poster: 'https://image.tmdb.org/t/p/w500/2cQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '泪之女王', titleEn: 'Queen of Tears', region: 'kr', year: 2024, rating: 8.5, genres: ['爱情', '剧情'], poster: 'https://image.tmdb.org/t/p/w500/3dQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '背着善宰跑', titleEn: 'Lovely Runner', region: 'kr', year: 2024, rating: 8.6, genres: ['爱情', '奇幻'], poster: 'https://image.tmdb.org/t/p/w500/4eQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '你的名字', titleEn: 'Your Name', region: 'jp', year: 2016, rating: 8.4, genres: ['爱情', '动画'], poster: 'https://image.tmdb.org/t/p/w500/q719jpXXxPDDqmpdOOZfYVbJg.jpg' },
      { title: '天气之子', titleEn: 'Weathering with You', region: 'jp', year: 2019, rating: 7.5, genres: ['爱情', '动画'], poster: 'https://image.tmdb.org/t/p/w500/qD9vQ9YqYqYqYqYqYqYqYq.jpg' },
      { title: '进击的巨人', titleEn: 'Attack on Titan', region: 'jp', year: 2013, rating: 9.0, genres: ['动作', '动画'], poster: 'https://image.tmdb.org/t/p/w500/hTP1DtSf1dX7YqYqYqYqYqYq.jpg' },
      { title: '鬼灭之刃', titleEn: 'Demon Slayer', region: 'jp', year: 2019, rating: 8.7, genres: ['动作', '动画'], poster: 'https://image.tmdb.org/t/p/w500/xUfRZu2yo8hLrQqYqYqYqYqYq.jpg' },
      { title: '咒术回战', titleEn: 'Jujutsu Kaisen', region: 'jp', year: 2020, rating: 8.5, genres: ['动作', '动画'], poster: 'https://image.tmdb.org/t/p/w500/yQjYqYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '间谍过家家', titleEn: 'Spy x Family', region: 'jp', year: 2022, rating: 8.5, genres: ['喜剧', '动画'], poster: 'https://image.tmdb.org/t/p/w500/zQjYqYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '排球少年', titleEn: 'Haikyuu!!', region: 'jp', year: 2014, rating: 8.6, genres: ['运动', '动画'], poster: 'https://image.tmdb.org/t/p/w500/1cQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '我的英雄学院', titleEn: 'My Hero Academia', region: 'jp', year: 2016, rating: 8.0, genres: ['动作', '动画'], poster: 'https://image.tmdb.org/t/p/w500/2dQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '海贼王', titleEn: 'One Piece', region: 'jp', year: 1999, rating: 8.9, genres: ['冒险', '动画'], poster: 'https://image.tmdb.org/t/p/w500/3eQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '火影忍者', titleEn: 'Naruto', region: 'jp', year: 2002, rating: 8.5, genres: ['动作', '动画'], poster: 'https://image.tmdb.org/t/p/w500/4fQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '名侦探柯南', titleEn: 'Detective Conan', region: 'jp', year: 1996, rating: 8.0, genres: ['悬疑', '动画'], poster: 'https://image.tmdb.org/t/p/w500/5gQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '银魂', titleEn: 'Gintama', region: 'jp', year: 2006, rating: 8.6, genres: ['喜剧', '动画'], poster: 'https://image.tmdb.org/t/p/w500/6hQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '死亡笔记', titleEn: 'Death Note', region: 'jp', year: 2006, rating: 9.0, genres: ['悬疑', '动画'], poster: 'https://image.tmdb.org/t/p/w500/7iQjYqYqYqYqYqYqYqYqYq.jpg' },
      { title: '钢之炼金术师', titleEn: 'Fullmetal Alchemist', region: 'jp', year: 2009, rating: 9.1, genres: ['动作', '动画'], poster: 'https://image.tmdb.org/t/p/w500/8jQjYqYqYqYqYqYqYqYqYq.jpg' }
    ]

    console.log('开始导入综艺数据...')
    for (let i = 0; i < varietyData.length; i++) {
      const item = varietyData[i]
      try {
        await db.collection('movies').add({
          data: {
            title: item.title,
            type: 'variety',
            mainCategory: '综艺',
            region: item.region,
            year: item.year,
            genres: item.genres,
            rating: item.rating,
            ratingSource: 'manual',
            description: '',
            cast: [],
            status: 'ongoing',
            viewCount: 0,
            sourceId: `variety_${i + 1}`,
            updatedAt: db.serverDate()
          }
        })
        console.log(`综艺 ${i + 1}/${varietyData.length}: ${item.title}`)
      } catch (err) {
        console.error('导入失败:', item.title, err)
      }
    }

    console.log('开始导入电影数据...')
    for (let i = 0; i < movieData.length; i++) {
      const item = movieData[i]
      try {
        await db.collection('movies').add({
          data: {
            title: item.title,
            titleEn: item.titleEn,
            type: 'movie',
            mainCategory: '电影',
            region: item.region,
            year: item.year,
            genres: item.genres,
            poster: item.poster,
            rating: item.rating,
            ratingSource: 'manual',
            description: '',
            cast: [],
            status: 'completed',
            viewCount: 0,
            sourceId: `movie_${i + 1}`,
            updatedAt: db.serverDate()
          }
        })
        console.log(`电影 ${i + 1}/${movieData.length}: ${item.title}`)
      } catch (err) {
        console.error('导入失败:', item.title, err)
      }
    }

    console.log('开始导入热剧数据...')
    for (let i = 0; i < dramaData.length; i++) {
      const item = dramaData[i]
      try {
        await db.collection('movies').add({
          data: {
            title: item.title,
            titleEn: item.titleEn,
            type: 'drama',
            mainCategory: '热剧',
            region: item.region,
            year: item.year,
            genres: item.genres,
            poster: item.poster,
            rating: item.rating,
            ratingSource: 'manual',
            description: '',
            cast: [],
            episodes: 0,
            status: 'completed',
            viewCount: 0,
            sourceId: `drama_${i + 1}`,
            updatedAt: db.serverDate()
          }
        })
        console.log(`热剧 ${i + 1}/${dramaData.length}: ${item.title}`)
      } catch (err) {
        console.error('导入失败:', item.title, err)
      }
    }

    this.globalData.dataImported = true
    console.log('全部数据导入完成! 共', varietyData.length + movieData.length + dramaData.length, '条')
  }
})
