"use strict"

var cursor;
var codeboard;
var owner;
var costumize;

$(document).ready(function(){
	costumize = new Array();
	costumize["#f1"] = "this is F1 default code";
	costumize["#f2"] = "this is F2 default code";
	costumize["#f3"] = "this is F3 default code";
	costumize["#f4"] = "this is F4 default code";
	codeboard = $('#codeboard').get(0);
	eventBinding();
});

function eventBinding () {
	$("#codeboard").mouseup(function(){
		cursor = new textInfo(codeboard);
	})
	.keydown(function(e){
		cursor = new textInfo(codeboard);
		var keyCode = e.keyCode;
		if (keyCode == 9) {
			e.preventDefault();
			cursor.insertTextInCursor("\t");
		}
		if (keyCode > 111 && keyCode < 116) {
			e.preventDefault();
			var fKey;
			switch(keyCode){
				case 112:
					fKey = "#f1";
					break;
				case 113:
					fKey = "#f2";
					break;
				case 114:
					fKey = "#f3";
					break;
				case 115:
					fKey = "#f4";
					break;
			}
			cursor.insertTextInCursor(costumize[fKey]);
		}
	});
	$('form').submit(function(){
		return false;
	})
	$('#interupt .btn-primary').click(function(){
		afterConfirm( $('#int').serialize(), interupt);
	});
	$('#oper .btn-primary').click(function(){
		afterConfirm( $('#ope').serialize(), operation);
	})
	$('#watchdog .btn-primary').click(function(){
		$('#watchdog').modal('hide');
		var watchdog = $('#wat').serialize();
		watchdog = watchdog.replace(/watchdog=/gi,"");
		watchdog = watchdog.replace(/&/gi,"+");
		cursor.insertTextInCursor("\n\tmov.w #WDTPM+"+watchdog+" ,&WDTCTL\n");
	});
	$('#timer .btn-primary').click(function(){
		afterConfirm($('#tim').serialize(),timer);
	});
	$('a[href="#RTC"]').click(function(){
		var rtc = "\n\tmov.w #RTCTEVIE + RTCSSEL_2 + RTCTEV_0,RTCCTL01\n\tmov.w #RT0PSDIV_2,&RTCPS0CTL\n\tmov.w #RT1SSEL_2 + RT1PSDIV_3,&RTCPS1CTL\n\n\tbis.b #GIE, SR\n";
		cursor.insertTextInCursor(rtc);
	});
	$('a[href="#init"]').click(function(){
		$('#codeboard').load('a.html');
	});

	/* commonly used */

	$('a[href="#for"]').click(function(){
		var forloop = "\n\tmov.w [loop times],R5;\t\n[loop name]:\t;loop name\n\t;write code here...\n\tsub.w #1,R5\n\tcmp.w #0, R5\n\tjz [loop name]\n";
		cursor.insertTextInCursor(forloop);
	});
	$('a[href="#xor"]').click(function(){
		var xor = "\n\txor.w [pattern], [register]\n"
		cursor.insertTextInCursor(xor);
	});
	$('a[href="#if_else"]').click(function(){
		var ife = "\n\tcmp.w [pattern1], [pattern2]\n\tjnz [if]\n\t;write else here...\n\tjmp [if_end]\n[if]:\n\t;write if here...\n[if_end]:\n";
		cursor.insertTextInCursor(ife);
	});

	/* costumize */

	$('a[href="#f1"],a[href="#f2"],a[href="#f3"],a[href="#f4"] ').click(function(){
		owner = $(this).attr("href");
		$('#costumize').modal("show");
	});
	$('#costumize .btn-primary').click(function(){
		costumize[owner.toString()] = $('#cosboard').val();
		$('#costumize').modal("hide");
	})
}

function afterConfirm (serial, callback) {
	callback(serial)
}

function interupt (serial) {
	$('#interupt').modal('hide');
	var dic = makeDic(serial);
	var code = codeboard.value;
	code = insertAfterTag(code, ";interupt", "\n"+dic["function_name"]+":\n\t;write interupt here...\n\tRETI");
	code = insertAfterTag(code, ";ISR", "\n\n\tORG\t"+dic["interupt"]+"\n\tDW\t"+dic["function_name"]);
	codeboard.value = code;
}
function operation (serial) {
	$('#oper').modal('hide');
	var dic = makeDic(serial);
	cursor.insertTextInCursor("bis.w #GIE|"+dic["mode"]+", SR\n");
}
function timer (serial) {
	$('#timer').modal("hide");
	var dic = makeDic(serial);
	var isr;
	var interupt;
	var snippet;
	if (dic['type'] == "CCR") {
		isr = "\n\tORG\t0FFE0h\n\tDW\tCCIFG0_ISR\n";
		interupt = "\nCCIFG0_ISR:\n\t;write ISR here...\n\tRETI\n";
		snippet = "\n\tmov.w #"+dic['ssel']+" + "+dic['mc']+" + TACLR ,&"+dic['timer']+"CTL\n\tmov.w #"+dic['HZ_number']+" ,&"+dic['timer']+"CCR0\n\tmov.w #CCIE, &"+dic['timer']+"CCTL0\n\tbis.b #GIE, SR\n";
	}else if (dic['type'] == "overflow") {
		isr = "\n\tORG\t0FFECh\n\tDW\tTIMER1_ISR\n";
		interupt = "\n[TA1IFG]_HND:\n\tADD &TA0IV,PC \nRETI \n\tJMP CCIFG_1_HND\n\tJMP CCIFG_2_HND\n\tJMP CCIFG_3_HND \n\tJMP CCIFG_4_HND \n\tJMP CCIFG_5_HND \n\tJMP CCIFG_6_HND \nCCIFG_6_HND ; Vector 12: [a]CCR6\n\t; Task starts here\n\tRETI\nCCIFG_5_HND\n\t; Task starts here\n\tRETI\nCCIFG_4_HND\n\t; Task starts here\n\tRETI\nCCIFG_3_HND\n\t; Task starts here\n\tRETI\nCCIFG_2_HND\n\t; Task starts here\n\tRETI\nCCIFG_1_HND\n\t; Task starts here\n\tRETI\n";
		snippet = "\n\tmov.w #"+dic['ssel']+" + "+dic['mc']+" + TACLR + TAIE, &"+dic['timer']+"CTL\n\tmov.w #"+dic['HZ_number']+", "+dic['timer']+"R\n\tbis.b #GIE, SR\n";
	}
	cursor.insertTextInCursor(snippet);
	var code = codeboard.value;
	code = insertAfterTag(code, ";ISR", isr);
	code = insertAfterTag(code, ";interupt", interupt);
	codeboard.value = code;

}

function makeDic (serial) {
	serial = serial.split("&");
	var dic = new Array();
	for (var i = 0; i < serial.length; i++) {
		serial[i] = serial[i].split("=");
		dic[serial[i][0].toString()] = serial[i][1];
	};
	return dic;
}
function insertAfterTag (source, pattern, text) {
	var indexTail = source.indexOf(pattern)+pattern.length;
	return source.substring(0,indexTail)+text+source.substring(indexTail);
}

function textInfo (e) {
	this.e = e;
	this.prefix = e.value.substring(0, e.selectionStart);
	this.suffix = e.value.substring(e.selectionEnd);
	this.start = e.selectionStart;

	this.insertTextInCursor = function(text){
		this.e.value = this.prefix + text + this.suffix; 
		codeboard.setSelectionRange(this.start+text.length,this.start+text.length);
	}
}

