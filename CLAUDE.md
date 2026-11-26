# יומן מסחר — הוראות לקלוד

## אחרי כל עריכה של קוד

לאחר ביצוע כל שינוי בקוד, הרץ **באופן אוטומטי** את הפקודות הבאות ללא בקשת אישור:

```bash
git add -A
git commit -m "תיאור השינוי"
git push
```

GitHub Actions יבנה את האפליקציה ויפרסם אותה ל-GitHub Pages אוטומטית תוך ~2 דקות לאחר ה-push.

**חשוב:** הפרסום רץ רק על push ל-`main`. push לענף אחר לא מעדכן את האתר החי.

## פרטי פרויקט

- שפה: React + TypeScript + Vite
- עיצוב: Tailwind CSS v4 (טוקנים ב-`@theme` בתוך `src/index.css`)
- גרפים: Recharts
- בסיס נתונים: Supabase
- GitHub Pages URL: https://netnetyy.github.io/trading-journal/

## מיקוד המשתמש

המשתמש הפסיק לסחור סווינג. הדגש הוא **השקעות לטווח ארוך**: זה מסך הבית.
מסכי הסווינג נשארים כ"ארכיון" ועובדים, אבל לא מפתחים בהם פיצ'רים חדשים בלי בקשה.
המשתמש משתמש בעיקר בטלפון: כל שינוי חייב לעבוד ברוחב 390px בלי גלילה לצדדים.

## מבנה הקוד

- `src/App.tsx`: ניתוב דרך ה-hash (`#/portfolio`, `#/history`, `#/dashboard`, `#/trades`, `#/trade-detail/<id>` ...), כך שכפתור "חזור" בטלפון עובד. מסכי הסווינג נטענים ב-`lazy`.
- `src/components/Layout.tsx`: סרגל צד במחשב, סרגל ניווט תחתון בטלפון.
- `src/components/ui.tsx`: רכיבים משותפים (Card, Button, Sheet = חלון שעולה מלמטה בטלפון, Field, Segmented, ChangePill).
- `src/portfolio/`: כל הלוגיקה של התיק לטווח ארוך:
  - `types.ts`: מבנה הנתונים
  - `store.ts`: טעינה/שמירה ל-Supabase, ומשיכת מחירים מ-Finnhub (`fetchQuote` מחזיר סיבת כישלון)
  - `calc.ts`: חישובים ופורמט מספרים
  - `usePortfolio.ts`: ה-hook שמחזיק את המצב ואת כל הפעולות
- `src/components/portfolio/`: מסכי התיק (PortfolioPage, HistoryPage, HoldingRow, PerformanceChart, AllocationCard, Sheets).
- מסכי הסווינג (`Dashboard`, `TradeLog`, `TradeForm`, `TradeDetail`, `Statistics`) כתובים ב-inline styles. ההתאמה שלהם לטלפון נעשית דרך המחלקות `page`, `rg-kpi`, `rg-stack`, `dialog-fit`, `wrap-sm` ב-`index.css`.

## נתונים (Supabase, טבלה `app_state`)

- **שורה 1:** יומן הסווינג (`AppData` ב-`src/types/trade.ts`).
- **שורה 2:** התיק לטווח ארוך: `{ investments, snapshots, closed }`.
  - **אפליקציית מעקב ההוצאות קוראת את אותה שורה.** מותר להוסיף שדות, אסור לשנות או למחוק שדות קיימים.
  - השמירה מפזרת (spread) את השורה הקיימת, כדי ששדות שאפליקציות אחרות כתבו לא יימחקו.
  - השקעה שנסגרה עוברת מ-`investments` ל-`closed` ולא נספרת יותר באף סכום.
  - `prevClose` (סגירת יום המסחר הקודם) משמש לחישוב השינוי היומי. הוא נשמר גם באפליקציה וגם בסקריפט הלילי.

## מחירים

- **בדפדפן:** מפתח Finnhub נשמר ב-`localStorage` (`finnhub_api_key`), לכל מכשיר בנפרד. הוא נבדק מול Finnhub לפני שמירה, ותווים נסתרים מוסרים.
- **אוטומטי:** `scripts/update-prices.mjs` דרך `.github/workflows/scheduled-price-update.yml`, בימי חול ב-21:23 UTC (אחרי סגירת השוק האמריקאי בקיץ ובחורף).
  - GitHub מאחר בהרצות מתוזמנות שמוגדרות על שעה עגולה (:00), לפעמים בכמה שעות, ולכן הדקה לא עגולה.
  - הסודות `FINNHUB_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` מוגדרים ב-GitHub Secrets.
  - ה-workflow מפעיל את עצמו מחדש בכל ריצה (job בשם keepalive), כי GitHub מכבה workflow מתוזמן אחרי 60 יום בלי commit.

## פרסום שנכשל

אם `deploy-pages` נכשל, **לא** מריצים מחדש את אותה ריצה: הריצה החוזרת מוצאת שני artifacts ונכשלת שוב.
במקום זה מפעילים ריצה חדשה: GitHub → Actions → "Deploy to GitHub Pages" → "Run workflow", או push חדש ל-`main`.

## בדיקה

- `npm run build` חייב לעבור.
- ב-`TradeForm` וב-`TradeLog` יש שגיאות eslint ישנות שלא חוסמות את הבנייה.
- לבדיקה ויזואלית: `npx vite preview` ו-Playwright במכשיר `iPhone 13`. בבדיקות עם הנתונים האמיתיים יש לחסום כתיבות ל-Supabase (route שמחזיר 201 לכל בקשה שאינה GET).
- בסשנים בענן: סביבת העבודה `trading-journal` מאפשרת גישה לאתר החי, ל-Supabase ול-Google Fonts.

## נתיב הפרויקט

כל הפקודות יש להריץ מתוך תיקיית `trading-journal/`
