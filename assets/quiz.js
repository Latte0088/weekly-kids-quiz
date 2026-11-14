
      "use strict";

      var QUESTIONS = QUIZ_DATA;

      var PRAISES = [
        "ピンポーン！すごい！🎉",
        "ピンポーン！やったね！🎉",
        "ピンポーン！てんさい！🎉",
        "ピンポーン！かんぺき！🎉"
      ];

      /* ---------- じょうたい ---------- */
      var idx = 0;          // いまの もんだい
      var attempts = 0;     // この もんだいで まちがえた かず
      var locked = false;   // せいかい ずみか
      var starKinds = [];   // 'gold' | 'silver'（もんだい ごと）

      var viewQuiz = document.getElementById("view-quiz");
      var viewResult = document.getElementById("view-result");
      var qCount = document.getElementById("qCount");
      var progressStars = document.getElementById("progressStars");
      var catChip = document.getElementById("catChip");
      var qIllust = document.getElementById("qIllust");
      var qText = document.getElementById("qText");
      var qSub = document.getElementById("qSub");
      var choicesBox = document.getElementById("choices");
      var feedbackTry = document.getElementById("feedbackTry");
      var hintText = document.getElementById("hintText");
      var correctArea = document.getElementById("correctArea");
      var praiseText = document.getElementById("praiseText");
      var factText = document.getElementById("factText");
      var nextBtn = document.getElementById("nextBtn");

      /* ---------- おと ---------- */
      var audioCtx = null;
      function beep(freq, start, dur, type, vol) {
        try {
          if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            audioCtx = new AC();
          }
          if (audioCtx.state === "suspended") audioCtx.resume();
          var t = audioCtx.currentTime + start;
          var osc = audioCtx.createOscillator();
          var gain = audioCtx.createGain();
          osc.type = type || "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(t); osc.stop(t + dur + 0.05);
        } catch (e) { /* おとが でなくても クイズは つづく */ }
      }
      function soundCorrect() { beep(659, 0, 0.18); beep(880, 0.14, 0.3); }
      function soundWrong() { beep(220, 0, 0.22, "triangle", 0.08); }
      function soundFanfare() {
        beep(523, 0, 0.16); beep(659, 0.15, 0.16); beep(784, 0.3, 0.16); beep(1046, 0.45, 0.4);
      }

      /* ---------- ほしの ひょうじ ---------- */
      function starHTML(kinds, total) {
        var html = "";
        for (var i = 0; i < total; i++) {
          if (kinds[i] === "gold") html += '<span class="on">★</span>';
          else if (kinds[i] === "silver") html += '<span class="silver">★</span>';
          else html += '<span class="off">★</span>';
        }
        return html;
      }
      function refreshProgress() {
        qCount.innerHTML = "<ruby>問題<rt>もんだい</rt></ruby> " + (idx + 1) + " / " + QUESTIONS.length;
        progressStars.innerHTML = starHTML(starKinds, QUESTIONS.length);
      }

      /* ---------- もんだいを だす ---------- */
      function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
      }

      function renderQuestion() {
        var item = QUESTIONS[idx];
        attempts = 0;
        locked = false;
        catChip.className = "cat-chip " + item.catClass;
        catChip.textContent = item.cat;
        qIllust.textContent = item.illust;
        qText.innerHTML = item.q;
        qSub.innerHTML = item.sub;
        feedbackTry.hidden = true;
        correctArea.hidden = true;
        choicesBox.innerHTML = "";

        shuffle(item.choices).forEach(function (choice) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "choice-btn";
          btn.innerHTML = choice.t;
          btn.addEventListener("click", function () { onChoice(btn, choice); });
          choicesBox.appendChild(btn);
        });
        refreshProgress();
      }

      function onChoice(btn, choice) {
        if (locked) return;
        var item = QUESTIONS[idx];
        if (!choice.ok) {
          attempts++;
          btn.classList.add("wrong-pick");
          btn.disabled = true;
          hintText.innerHTML = item.hint;
          feedbackTry.hidden = false;
          soundWrong();
          return;
        }
        // せいかい！
        locked = true;
        starKinds[idx] = attempts === 0 ? "gold" : "silver";
        btn.classList.add("right-pick");
        var all = choicesBox.querySelectorAll(".choice-btn");
        for (var i = 0; i < all.length; i++) all[i].disabled = true;
        feedbackTry.hidden = true;
        praiseText.textContent = PRAISES[Math.floor(Math.random() * PRAISES.length)];
        factText.innerHTML = item.fact;
        nextBtn.innerHTML = idx === QUESTIONS.length - 1
          ? "けっかを みる 🏆"
          : "つぎの <ruby>問題<rt>もんだい</rt></ruby>へ ▶";
        correctArea.hidden = false;
        refreshProgress();
        soundCorrect();
        correctArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      nextBtn.addEventListener("click", function () {
        if (idx === QUESTIONS.length - 1) { showResult(); return; }
        idx++;
        renderQuestion();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      /* ---------- けっか ---------- */
      function showResult() {
        viewQuiz.hidden = true;
        viewResult.hidden = false;
        var gold = 0;
        starKinds.forEach(function (k) { if (k === "gold") gold++; });

        document.getElementById("resultStars").innerHTML = starHTML(starKinds, QUESTIONS.length);

        var medalName = document.getElementById("medalName");
        var resultMsg = document.getElementById("resultMsg");
        var medalCircle = document.getElementById("medalCircle");
        if (gold === QUESTIONS.length) {
          medalCircle.setAttribute("fill", "#f5a623");
          medalName.innerHTML = "🏆 きんメダル ゲット！";
          resultMsg.textContent = "ぜんもん いっかいで せいかい！すごすぎる！あたまの たいそう バッチリだね。";
        } else if (gold >= 3) {
          medalCircle.setAttribute("fill", "#9fb3c8");
          medalName.innerHTML = "🥈 ぎんメダル ゲット！";
          resultMsg.textContent = "よく かんがえたね！あと すこしで きんメダル。もういちど やって みよう！";
        } else {
          medalCircle.setAttribute("fill", "#cd7f32");
          medalName.innerHTML = "🥉 どうメダル ゲット！";
          resultMsg.textContent = "さいごまで がんばったね！まめちしきを おぼえて、もういちど やると ほしが ふえるかも！";
        }
        soundFanfare();
        launchConfetti();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function launchConfetti() {
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) return;
        var card = document.getElementById("resultCard");
        var glyphs = ["★", "🎉", "✦", "●"];
        var colors = ["#f5a623", "#ff6b4a", "#00a896", "#3d9bff", "#ff7ba9"];
        for (var i = 0; i < 26; i++) {
          var s = document.createElement("span");
          s.className = "confetti-star";
          s.textContent = glyphs[i % glyphs.length];
          s.style.left = (Math.random() * 96) + "%";
          s.style.color = colors[i % colors.length];
          s.style.fontSize = (14 + Math.random() * 18) + "px";
          s.style.animationDuration = (1.6 + Math.random() * 1.8) + "s";
          s.style.animationDelay = (Math.random() * 0.7) + "s";
          card.appendChild(s);
          (function (el) { setTimeout(function () { el.remove(); }, 4600); })(s);
        }
      }

      /* ---------- がめんの きりかえ（ページ版） ---------- */
      function startQuiz() {
        idx = 0;
        starKinds = [];
        viewResult.hidden = true;
        viewQuiz.hidden = false;
        renderQuestion();
        window.scrollTo({ top: 0 });
      }
      function goHome() { location.href = "index.html"; }

      document.getElementById("backHome").addEventListener("click", goHome);
      document.getElementById("againBtn").addEventListener("click", startQuiz);
      document.getElementById("resultHomeBtn").addEventListener("click", goHome);

      startQuiz();
