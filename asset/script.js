// Hàm tự động co giãn trang web thông minh theo màn hình điện thoại / máy tính
window.autoScale = function () {
  var scaler = document.getElementById("scaler");
  var wrap = document.getElementById("wrap");
  if (!scaler || !wrap) return;

  var winW = window.innerWidth;
  var winH = window.innerHeight;

  var baseW = 1100;
  var baseH = 680;

  var scale;
  if (winW >= baseW && winH >= baseH + 30) {
    scale = 1;
  } else {
    // Trừ khoảng đệm nhỏ để không chạm sát viền màn hình
    var padW = 14;
    var padH = 14;

    var scaleW = (winW - padW) / baseW;
    var scaleH = (winH - padH) / baseH;

    if (winW > winH) {
      // Khi xoay ngang điện thoại: fit vừa cả chiều ngang lẫn dọc
      scale = Math.min(scaleW, scaleH);
    } else {
      // Khi xoay dọc điện thoại: fit theo chiều ngang
      scale = scaleW;
    }
  }

  scale = Math.min(scale, 1);
  window.currentScale = scale;

  wrap.style.transform = "scale(" + scale + ")";
  wrap.style.transformOrigin = "0 0";

  scaler.style.width = Math.round(baseW * scale) + "px";
  scaler.style.height = Math.round(baseH * scale) + "px";
};

// Gọi autoScale ngay khi load script
window.autoScale();
$(window).on("resize orientationchange load", window.autoScale);

(function () {
  var canvas = $("#canvas");

  if (!canvas[0].getContext) {
    $("#error").show();
    return false;
  }

  var width = canvas.width();
  var height = canvas.height();
  canvas.attr("width", width);
  canvas.attr("height", height);
  var opts = {
    seed: {
      x: width / 2 - 20,
      color: "rgb(190, 26, 37)",
      scale: 2,
    },
    branch: [
      [ 535, 680, 570, 250, 500, 200, 30, 100,
        [
          [ 540,500,455,417,340, 400, 13, 100,
            [[450, 435, 434, 430, 394, 395, 2, 40]],
          ],
          [ 550, 445, 600, 356, 680, 345, 12, 100,
            [[578, 400, 648, 409, 661, 426, 3, 80]],
          ],
          [539, 281, 537, 248, 534, 217, 3, 40],
          [ 546, 397, 413, 247, 328, 244, 9, 80,
            [
              [427, 286, 383, 253, 371, 205, 2, 40],
              [498, 345, 435, 315, 395, 330, 4, 60],
            ],
          ],
          [ 546, 357, 608, 252, 678, 221, 6, 100,
            [[590, 293, 646, 277, 648, 271, 2, 80]],
          ],
        ],
      ],
    ],
    bloom: {
      num: 700,
      width: 1080,
      height: 650,
    },
    footer: {
      width: 1200,
      height: 5,
      speed: 10,
    },
  };

  var tree = new Tree(canvas[0], width, height, opts);
  var seed = tree.seed;
  var foot = tree.footer;
  var hold = 1;

  function triggerSeed(e) {
    if (!hold) return;
    var offset = canvas.offset();
    var s = window.currentScale || 1;
    var pageX = e.pageX;
    var pageY = e.pageY;

    if (e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches.length > 0) {
      pageX = e.originalEvent.changedTouches[0].pageX;
      pageY = e.originalEvent.changedTouches[0].pageY;
    } else if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length > 0) {
      pageX = e.originalEvent.touches[0].pageX;
      pageY = e.originalEvent.touches[0].pageY;
    }

    var x = (pageX - offset.left) / s;
    var y = (pageY - offset.top) / s;

    var isMobile = ('ontouchstart' in window) || (window.innerWidth < 800);
    var seedDist = Math.hypot(x - (width / 2 - 20), y - (height - 30));

    if (seed.hover(x, y) || (isMobile && (seedDist < 180 || e.type === 'touchend' || e.type === 'click'))) {
      hold = 0;
      canvas.unbind("click touchend mousemove");
      $("#tap-hint").fadeOut(400);
      canvas.removeClass("hand");
    }
  }

  canvas
    .on("click touchend", triggerSeed)
    .mousemove(function (e) {
      var offset = canvas.offset();
      var s = window.currentScale || 1;
      var x = (e.pageX - offset.left) / s;
      var y = (e.pageY - offset.top) / s;
      canvas.toggleClass("hand", seed.hover(x, y));
    });

  $("#tap-hint").on("click touchend", function(e) {
    e.stopPropagation();
    if (hold) {
      hold = 0;
      canvas.unbind("click touchend mousemove");
      $("#tap-hint").fadeOut(400);
      canvas.removeClass("hand");
    }
  });

  var seedAnimate = eval(
    Jscex.compile("async", function () {
      seed.draw();
      while (hold) {
        $await(Jscex.Async.sleep(10));
      }
      while (seed.canScale()) {
        seed.scale(0.95);
        $await(Jscex.Async.sleep(10));
      }
      while (seed.canMove()) {
        seed.move(0, 2);
        foot.draw();
        $await(Jscex.Async.sleep(10));
      }
    })
  );

  var growAnimate = eval(
    Jscex.compile("async", function () {
      do {
        tree.grow();
        $await(Jscex.Async.sleep(10));
      } while (tree.canGrow());
    })
  );

  var flowAnimate = eval(
    Jscex.compile("async", function () {
      do {
        tree.flower(2);
        $await(Jscex.Async.sleep(10));
      } while (tree.canFlower());
    })
  );

  var moveAnimate = eval(
    Jscex.compile("async", function () {
      tree.snapshot("p1", 240, 0, 610, 680);
      while (tree.move("p1", 500, 0)) {
        foot.draw();
        $await(Jscex.Async.sleep(10));
      }
      foot.draw();
      tree.snapshot("p2", 500, 0, 610, 680);

      canvas
        .parent()
        .css("background", "url(" + tree.toDataURL("image/png") + ")");
      canvas.css("background", "#ffe");
      $await(Jscex.Async.sleep(300));
      canvas.css("background", "none");
    })
  );

  var jumpAnimate = eval(
    Jscex.compile("async", function () {
      var ctx = tree.ctx;
      while (true) {
        tree.ctx.clearRect(0, 0, width, height);
        tree.jump();
        foot.draw();
        $await(Jscex.Async.sleep(25));
      }
    })
  );

  var textAnimate = eval(
    Jscex.compile("async", function () {
      $("#code").show().typewriter();
    })
  );

  var runAsync = eval(
    Jscex.compile("async", function () {
      $await(seedAnimate());
      $await(growAnimate());
      $await(flowAnimate());
      $await(moveAnimate());

      // Nhẹ nhàng làm xuất hiện 3 tấm ảnh Polaroid treo trên cây tình yêu
      $("#tree-photos").fadeIn(1200);

      // Hiển thị nút đọc thư cỡ lớn trên điện thoại
      $("#mobile-read-btn").css("display", "inline-flex").hide().fadeIn(1500);

      textAnimate().start();

      $await(jumpAnimate());
    })
  );

  runAsync().start();
})();

// Xử lý mở / đóng Modal phóng to xem ảnh
window.openModal = function (src, caption) {
  $("#modalImg").attr("src", src);
  $("#modalCaption").text(caption);
  $("#imgModal").css("display", "flex").hide().fadeIn(250);
};

window.closeModal = function () {
  $("#imgModal").fadeOut(200);
};

// Xử lý mở / đóng Modal đọc thư cỡ lớn trên điện thoại
window.openLetterModal = function () {
  $("#letterModal").css("display", "flex").hide().fadeIn(250);
};

window.closeLetterModal = function () {
  $("#letterModal").fadeOut(200);
};

// Đóng modal khi nhấn phím Escape (ESC)
$(document).keyup(function (e) {
  if (e.key === "Escape") {
    window.closeModal();
    window.closeLetterModal();
  }
});

// Tự động phát nhạc khi chạm hoặc click lần đầu (đặc biệt hỗ trợ iOS Safari & Chrome Mobile)
function playMusic() {
  var audio = document.getElementById("myAudio");
  if (audio && audio.paused) {
    audio.play().catch(function() {});
  }
}
document.addEventListener("click", playMusic);
document.addEventListener("touchstart", playMusic, { passive: true });