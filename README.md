# Muhfil

Muhfil — zamonaviy, tezkor va qulay blog platformasi (Medium kloni).

## Imkoniyatlar
- Foydalanuvchilar ro‘yxatdan o‘tishi va tizimga kirishi (Google OAuth va Email/Password)
- Hikoyalar yozish (boy matn muharriri, rasm va video qo‘shish imkoniyati)
- Lenta (For you, Activity)
- Maqolalarga like (qarsaklar), izohlar qoldirish va saqlash (Library / Reading list)
- Mualliflarni kuzatish (Follow / Unfollow)
- Sozlamalar (Profil, Avatar, Litsenziya, Bildirishnomalar va Parol xavfsizligi)
- Qorong‘i / Yorug‘ mavzular (Dark / Light mode)
- Maxsus yuklanish animatsiyasi (Cloud loader)

## Texnologiyalar
- **Backend:** Python / Django
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript, Bootstrap Icons
- **Production Server:** Gunicorn, WhiteNoise, PostgreSQL

## Railway orqali Deploy qilish
1. Railway loyihasiga ushbu repozitoriyni ulang.
2. PostgreSQL bazasini loyihaga qo‘shing (DATABASE_URL avtomatik ulanadi).
3. Kerakli o‘zgaruvchilarni kiriting:
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - SECRET_KEY
4. Networking bo‘limida **Generate Domain** tugmasini bosing (Port: 8080).
